import { createClient } from "@/lib/supabase/client";

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

// 1. awardXP: Safe for client/server context (using browser client by default)
export async function awardXP(userId: string, award: { amount: number }) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("increment_xp", {
    user_id: userId,
    amount: award.amount,
  });
  return { success: !error, xp: data?.[0]?.xp ?? 0 };
}

// 2. awardXPBySource: RESTORED export
export async function awardXPBySource(userId: string, source: XPSource, metadata?: any) {
  const amount = getXPAmount(source, metadata);
  return awardXP(userId, { amount });
}

// 3. awardXPClient: Aliased for compatibility
export const awardXPClient = awardXP;

export function calculateLevel(xp: number) { return Math.floor(xp / 100) + 1; }
export function xpForLevel(level: number) { return (level - 1) * 100; }
export function xpProgress(xp: number) {
  const level = calculateLevel(xp);
  const start = xpForLevel(level);
  const end = xpForLevel(level + 1);
  return Math.min(100, Math.max(0, ((xp - start) / (end - start)) * 100));
}