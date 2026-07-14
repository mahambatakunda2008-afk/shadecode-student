import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type XPSource = "task_completion" | "lesson_generation" | "lesson_completion" | "exam_completion" | "streak_milestone" | "achievement_unlock" | "perfect_day";

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

export async function awardXPClient(userId: string, amount: number) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("increment_xp", { user_id: userId, amount });
  return { success: !error, data };
}

export function calculateLevel(xp: number) { return Math.floor(xp / 100) + 1; }