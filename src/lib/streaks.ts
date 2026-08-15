/**
 * src/lib/streaks.ts
 *
 * Pure streak-transition logic, extracted from the day-gap/increment rules
 * already live in `src/lib/cortex/memoryTracker.ts`'s `updateStreak()`, plus
 * the new "one free miss per week" freeze mechanic from `.cortex/tasks.md`
 * Phase 2. Kept side-effect-free and here (not in memoryTracker.ts) so the
 * transition rules are directly testable without a Supabase client, and so
 * `StreakDisplay` can reuse `getISOWeekKey`/`isFreezeAvailable` for display
 * purposes without duplicating the week-key math.
 *
 * Date semantics deliberately match the pre-existing behavior in
 * memoryTracker.ts: "today" and stored dates are compared as UTC calendar
 * dates (the codebase's existing `new Date().toISOString().split('T')[0]`
 * convention), not wall-clock/local dates. Not introducing a new
 * inconsistency here -- just giving the existing one a single definition.
 */

export function dateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

/** Whole UTC calendar days between two YYYY-MM-DD keys (b - a). */
function daysBetween(aKey: string, bKey: string): number {
  const [ay, am, ad] = aKey.split("-").map(Number);
  const [by, bm, bd] = bKey.split("-").map(Number);
  const a = Date.UTC(ay, am - 1, ad);
  const b = Date.UTC(by, bm - 1, bd);
  return Math.round((b - a) / 86_400_000);
}

/** ISO-8601 week key, e.g. "2026-W33". Monday-start, per the ISO standard. */
export function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/** A freeze is available if none has been used in the current ISO week yet. */
export function isFreezeAvailable(freezeWeek: string | undefined, now: Date = new Date()): boolean {
  return freezeWeek !== getISOWeekKey(now);
}

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate?: string;
  /** ISO week key of the last streak-freeze use, if any. */
  freezeWeek?: string;
}

export interface StreakTransitionResult {
  streak: number;
  longestStreak: number;
  freezeWeek?: string;
  /** True when this transition consumed the week's freeze to save the streak. */
  freezeConsumed: boolean;
}

/**
 * Computes the next streak state given today's activity. Mirrors
 * memoryTracker.ts's original rules (same-day no-op, consecutive-day
 * increment, gap-of-2+ reset) and adds one new case: a gap of exactly one
 * missed day is forgiven once per ISO week by consuming that week's freeze
 * instead of resetting to 1.
 */
export function computeStreakUpdate(
  state: StreakState,
  studiedToday: boolean,
  now: Date = new Date()
): StreakTransitionResult {
  const today = dateKey(now);
  const lastDate = state.lastStudyDate?.split("T")[0];
  const { currentStreak, longestStreak, freezeWeek } = state;

  if (studiedToday) {
    if (lastDate === today) {
      // Already studied today -- no change.
      return { streak: currentStreak, longestStreak, freezeWeek, freezeConsumed: false };
    }

    const gap = lastDate ? daysBetween(lastDate, today) : Infinity;

    if (gap === 1) {
      const streak = currentStreak + 1;
      return { streak, longestStreak: Math.max(longestStreak, streak), freezeWeek, freezeConsumed: false };
    }

    if (gap === 2 && isFreezeAvailable(freezeWeek, now)) {
      // Missed exactly one day, and this week's freeze hasn't been used yet
      // -- forgive the gap and continue the streak instead of resetting it.
      const streak = currentStreak + 1;
      return {
        streak,
        longestStreak: Math.max(longestStreak, streak),
        freezeWeek: getISOWeekKey(now),
        freezeConsumed: true,
      };
    }

    // Gap too large, or freeze already used this week -- streak restarts.
    return { streak: 1, longestStreak, freezeWeek, freezeConsumed: false };
  }

  // studiedToday === false: only reachable if a caller explicitly checks in
  // on a day with no activity (no current caller does this -- see
  // memoryTracker.ts's comment on updateStreak -- but the rule is preserved
  // for API completeness / future callers such as a daily digest job).
  if (lastDate) {
    const gap = daysBetween(lastDate, today);
    if (gap > 1) {
      return { streak: 0, longestStreak, freezeWeek, freezeConsumed: false };
    }
  }
  return { streak: currentStreak, longestStreak, freezeWeek, freezeConsumed: false };
}
