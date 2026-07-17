import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

// awardXP is called from server-side API routes on behalf of an explicit
// userId -- it never relied on a browser session in the first place, so it
// needs a service-role client, not the browser client. The browser client
// (createBrowserClient) has no cookies/session in a server route context,
// meaning every RPC call ran unauthenticated and was almost certainly being
// silently blocked by RLS on `increment_xp` -- awardXP swallowed the error
// and returned {success:false}, which no caller checked. XP was very likely
// not actually being awarded on lesson/exam completion.
function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export type XPSource =
  | "task_completion" | "lesson_generation" | "lesson_completion"
  | "exam_completion" | "streak_milestone" | "achievement_unlock" | "perfect_day";

export const XP_AMOUNTS: Record<XPSource, (val?: any) => number> = {
  task_completion: () => 10,
  lesson_generation: (diff = "medium") => diff === "hard" ? 30 : diff === "easy" ? 20 : 25,
  lesson_completion: () => 35,
  exam_completion: () => 50,
  streak_milestone: (days) => {
    const d = parseInt(days || "3");
    return d >= 30 ? 500 : d >= 7 ? 150 : d >= 3 ? 75 : 25;
  },
  achievement_unlock: (r) => r === "legendary" ? 500 : r === "epic" ? 250 : r === "rare" ? 100 : 25,
  perfect_day: () => 80,
};

// Internal utility to calculate amount
export function getXPAmount(source: XPSource, metadata?: Record<string, any>): number {
  const amountFn = XP_AMOUNTS[source];
  return amountFn ? amountFn(metadata?.difficulty || metadata?.rarity || metadata?.days) : 10;
}

// 1. awardXP: server-side, service-role client (works from any API route
//    regardless of browser session, operates on the explicit userId given)
export async function awardXP(userId: string, award: { amount: number }) {
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc("increment_xp", {
    user_id: userId,
    amount: award.amount,
  });
  if (error) console.error("[XP] increment_xp failed:", error.message, { userId, amount: award.amount });
  return {
    success: !error,
    xp: data?.[0]?.xp ?? 0,
    level: data?.[0]?.level ?? 1,
    streak: data?.[0]?.streak ?? 0,
  };
}

// 2. awardXPBySource: RESTORED export
export async function awardXPBySource(userId: string, source: XPSource, metadata?: any) {
  const amount = getXPAmount(source, metadata);
  return awardXP(userId, { amount });
}

// 3. awardXPClient: for genuine client-side ("use client") callers, e.g.
//    tasks/page.tsx -- uses the browser client so it runs as the logged-in
//    user's own session, which is what RLS on increment_xp expects here.
export async function awardXPClient(userId: string, award: { amount: number }) {
  const supabase = createBrowserClient();
  const { data, error } = await supabase.rpc("increment_xp", {
    user_id: userId,
    amount: award.amount,
  });
  if (error) console.error("[XP] increment_xp failed (client):", error.message, { userId, amount: award.amount });
  return {
    success: !error,
    xp: data?.[0]?.xp ?? 0,
    level: data?.[0]?.level ?? 1,
    streak: data?.[0]?.streak ?? 0,
  };
}

export function calculateLevel(xp: number) { return Math.floor(xp / 100) + 1; }
export function xpForLevel(level: number) { return (level - 1) * 100; }
export function xpProgress(xp: number) {
  const level = calculateLevel(xp);
  const start = xpForLevel(level);
  const end = xpForLevel(level + 1);
  return Math.min(100, Math.max(0, ((xp - start) / (end - start)) * 100));
}