import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveInsight, createInsight } from "@/lib/cortex/runtime/insights";
import { getWeekStartUTC, computeGoalProgress } from "@/lib/goals";
import type { CortexSnapshot } from "@/lib/cortex/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/insights/generate
 *
 * This route previously always inserted the same hardcoded sentence
 * ("Cortex observed you are actively using Shadecode Student! Keep
 * going.") regardless of any real data, and had zero callers anywhere in
 * the app (confirmed via repo-wide search 2026-08-13) -- dead, fabricated
 * code sitting next to a fully-built deterministic insight engine
 * (`resolveDeterministicInsight` in `runtime/templates.ts`) that it never
 * called. Rewired to build a real snapshot from the student's actual
 * profile/tasks/subjects/goal data and use that engine instead of
 * inventing a fourth parallel one.
 */
export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [{ data: profile }, { data: tasks }, { data: subjects }, { data: sessions }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("streak, xp, level, weekly_goal_minutes")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("tasks").select("id, completed, title, created_at").eq("user_id", user.id),
        supabase.from("subjects").select("name").eq("user_id", user.id),
        supabase
          .from("focus_sessions")
          .select("duration_minutes")
          .eq("user_id", user.id)
          .gte("created_at", getWeekStartUTC().toISOString()),
      ]);

    const totalTasks = tasks?.length ?? 0;
    const completedTasks = tasks?.filter((t) => t.completed).length ?? 0;
    const pendingTasks = totalTasks - completedTasks;
    const recentTaskTitles = (tasks ?? [])
      .filter((t) => !t.completed)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 3)
      .map((t) => t.title)
      .filter(Boolean);

    const minutesThisWeek = (sessions ?? []).reduce(
      (sum, row) => sum + (row.duration_minutes ?? 0),
      0
    );
    const goalProgress = computeGoalProgress(profile?.weekly_goal_minutes ?? null, minutesThisWeek);

    const snapshot: CortexSnapshot = {
      streak: profile?.streak ?? 0,
      level: profile?.level ?? 1,
      xp: profile?.xp ?? 0,
      totalTasks,
      completedTasks,
      pendingTasks,
      subjects: (subjects ?? []).map((s) => s.name).filter(Boolean),
      recentTaskTitles,
      ...(goalProgress.weeklyGoalMinutes !== null
        ? {
            weeklyGoalMinutes: goalProgress.weeklyGoalMinutes,
            minutesThisWeek: goalProgress.minutesThisWeek,
            goalPercentComplete: goalProgress.percentComplete ?? 0,
          }
        : {}),
    };

    const text = resolveInsight({ snapshot, events: [] });

    // resolveInsight() returns null when no template matches -- report that
    // honestly instead of inventing generic praise to fill the gap.
    if (!text) {
      return NextResponse.json(
        { error: "Not enough recent activity to generate a new insight yet." },
        { status: 422 }
      );
    }

    const created = await createInsight(user.id, text);
    return NextResponse.json({ message: "Insight generated successfully", insight: created });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate insight" },
      { status: 500 }
    );
  }
}
