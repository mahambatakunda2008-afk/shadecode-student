import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getWeekStartUTC,
  computeGoalProgress,
  isValidWeeklyGoalMinutes,
  suggestWeeklyGoalMinutes,
  weeklyTotalsBefore,
} from "@/lib/goals";

export const dynamic = "force-dynamic";

/**
 * GET /api/goals
 * Returns the student's weekly study-time goal and their real progress
 * against it this week, computed from focus_sessions rows (see
 * src/lib/goals.ts for why that's the source of truth, not a guess).
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("weekly_goal_minutes")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const weekStart = getWeekStartUTC();
    const { data: sessions, error: sessionsError } = await supabase
      .from("focus_sessions")
      .select("duration_minutes")
      .eq("user_id", user.id)
      .gte("created_at", weekStart.toISOString());

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 });
    }

    const minutesThisWeek = (sessions ?? []).reduce(
      (sum, row) => sum + (row.duration_minutes ?? 0),
      0
    );

    const chosen: number | null = profile?.weekly_goal_minutes ?? null;
    if (chosen) {
      return NextResponse.json({ ...computeGoalProgress(chosen, minutesThisWeek), goalSource: "set" });
    }

    // No explicit goal: derive a target from the student's own last four weeks
    // instead of asking them to type one. Nothing is stored; they can still set one.
    const historyStart = new Date(weekStart.getTime() - 28 * 24 * 60 * 60 * 1000);
    const { data: history } = await supabase
      .from("focus_sessions")
      .select("created_at,duration_minutes")
      .eq("user_id", user.id)
      .gte("created_at", historyStart.toISOString())
      .lt("created_at", weekStart.toISOString());
    const suggested = suggestWeeklyGoalMinutes(weeklyTotalsBefore(history ?? [], weekStart));
    const progress = computeGoalProgress(suggested, minutesThisWeek);
    return NextResponse.json({ ...progress, goalSource: suggested ? "history" : null });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load goal progress" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/goals
 * Sets (or clears, with weeklyGoalMinutes: null) the student's weekly
 * study-time goal. Body: { weeklyGoalMinutes: number | null }.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const weeklyGoalMinutes = body.weeklyGoalMinutes;

    if (weeklyGoalMinutes !== null && !isValidWeeklyGoalMinutes(weeklyGoalMinutes)) {
      return NextResponse.json(
        { error: "weeklyGoalMinutes must be a number between 30 and 4200, or null to clear it" },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ weekly_goal_minutes: weeklyGoalMinutes })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Re-fetch this week's real progress against the new goal, same as GET,
    // so the client can render immediately without a second round trip.
    const weekStart = getWeekStartUTC();
    const { data: sessions } = await supabase
      .from("focus_sessions")
      .select("duration_minutes")
      .eq("user_id", user.id)
      .gte("created_at", weekStart.toISOString());

    const minutesThisWeek = (sessions ?? []).reduce(
      (sum, row) => sum + (row.duration_minutes ?? 0),
      0
    );

    return NextResponse.json(computeGoalProgress(weeklyGoalMinutes, minutesThisWeek));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save weekly goal" },
      { status: 500 }
    );
  }
}
