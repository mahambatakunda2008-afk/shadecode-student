import { createClient } from "@/lib/supabase/client";

/**
 * Reads the cross-instance invalidation generation. If offline or unavailable,
 * callers must not trust a process-local cached recommendation snapshot.
 */
export async function getRecommendationCacheVersion(userId: string): Promise<number | null> {
  if (!userId) return null;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("recommendation_cache_versions")
      .select("version")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return null;
    return Number(data?.version ?? 0);
  } catch {
    return null;
  }
}
