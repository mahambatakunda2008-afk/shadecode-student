import { normalizeLearningEvent, type SupportedSourceEvent } from "./learningEvents";

/**
 * Server-side bridge for product mutations that already have an authenticated user.
 * It intentionally shares the exact canonical normalizer used by the public ingress.
 */
export async function emitServerLearningEvent(input: SupportedSourceEvent): Promise<boolean> {
  const normalized = normalizeLearningEvent(input);
  if (normalized.status !== "accepted") return false;

  // Keep server emitters dependency-light. Persistence is delegated to the same
  // Supabase RPC used by the authenticated API route.
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("insert_canonical_cortex_event", {
    p_user_id: input.userId,
    p_event: normalized.event,
  });
  if (error) {
    console.error("[learning-events] server persistence failed:", error);
    return false;
  }
  return true;
}
