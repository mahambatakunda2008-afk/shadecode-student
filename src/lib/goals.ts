/**
 * src/lib/goals.ts
 *
 * Pure logic for the Goals System (`.cortex/tasks.md` Phase 2). Week
 * boundary uses the same Monday-start convention as `src/lib/streaks.ts`'s
 * ISO week keys, for consistency across the app.
 *
 * Progress is computed from `focus_sessions.duration_minutes` -- the only
 * per-session, timestamped study-duration log that actually exists and is
 * now actually written to (see the 2026-08-13 fix in
 * `src/app/(app)/focus/page.tsx`; the table existed with full RLS but had
 * zero writers anywhere in the repo before that). This deliberately does
 * NOT claim to cover every form of studying (lesson reading, exam prep,
 * etc. aren't logged anywhere with a timestamp) -- it's labeled "focused
 * study time" in the UI for exactly that reason, not "study time" in
 * general, so it doesn't overclaim what it measures.
 */

export function getWeekStartUTC(now: Date = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const isoDay = d.getUTCDay() || 7; // Mon=1 ... Sun=7
  d.setUTCDate(d.getUTCDate() - (isoDay - 1));
  return d;
}

export interface GoalProgress {
  weeklyGoalMinutes: number | null;
  minutesThisWeek: number;
  /** Null when no goal is set -- there's nothing to show a percentage of. */
  percentComplete: number | null;
  goalMet: boolean;
  /** "set" = chosen by the student; "history" = derived from their last weeks of focus sessions. */
  goalSource?: GoalSource | null;
}

export function computeGoalProgress(
  weeklyGoalMinutes: number | null | undefined,
  minutesThisWeek: number
): GoalProgress {
  if (!weeklyGoalMinutes || weeklyGoalMinutes <= 0) {
    return { weeklyGoalMinutes: null, minutesThisWeek, percentComplete: null, goalMet: false };
  }
  const percentComplete = Math.min(100, Math.round((minutesThisWeek / weeklyGoalMinutes) * 100));
  return {
    weeklyGoalMinutes,
    minutesThisWeek,
    percentComplete,
    goalMet: minutesThisWeek >= weeklyGoalMinutes,
  };
}

export const MIN_WEEKLY_GOAL_MINUTES = 30;
export const MAX_WEEKLY_GOAL_MINUTES = 4200; // 70 hours/week, a generous sanity ceiling

export function isValidWeeklyGoalMinutes(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= MIN_WEEKLY_GOAL_MINUTES &&
    value <= MAX_WEEKLY_GOAL_MINUTES
  );
}

export type GoalSource = "set" | "history";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Focused minutes for each of the `weeks` COMPLETED weeks before `weekStart`
 * (index 0 = last week). Only real focus_sessions rows count.
 */
export function weeklyTotalsBefore(
  rows: ReadonlyArray<{ created_at: string; duration_minutes: number | null }>,
  weekStart: Date,
  weeks = 4
): number[] {
  const totals = Array.from({ length: weeks }, () => 0);
  for (const row of rows) {
    const t = Date.parse(row.created_at);
    if (!Number.isFinite(t) || t >= weekStart.getTime()) continue;
    const index = Math.floor((weekStart.getTime() - t - 1) / WEEK_MS);
    if (index >= 0 && index < weeks) totals[index] += Math.max(0, row.duration_minutes ?? 0);
  }
  return totals;
}

/**
 * A default weekly target derived from what the student has actually done,
 * so no one has to guess a number. Needs at least two active weeks of real
 * history; returns null otherwise (we never invent a target for a new user).
 * Rounded to 15 minutes and kept inside the valid goal range.
 */
export function suggestWeeklyGoalMinutes(weeklyTotals: readonly number[]): number | null {
  const active = weeklyTotals.filter((n) => Number.isFinite(n) && n > 0);
  if (active.length < 2) return null;
  const average = active.reduce((sum, n) => sum + n, 0) / active.length;
  const rounded = Math.round(average / 15) * 15;
  return Math.min(MAX_WEEKLY_GOAL_MINUTES, Math.max(MIN_WEEKLY_GOAL_MINUTES, rounded));
}
