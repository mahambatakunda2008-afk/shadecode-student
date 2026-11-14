/**
 * src/lib/dashboard/realData.ts
 *
 * Pure rules for which dashboard numbers are REAL. The intelligence services
 * return 0 for "no data yet" (empty lessons, no exams). A zero default must
 * never be shown as a score, so each metric returns null until there is
 * evidence behind it, and the dashboard hides what is null.
 */

export interface LessonStamp {
  lastAttempted?: string | null;
}

/** Overall completion is only meaningful once the learner has at least one lesson. */
export function progressMetric(lessonCount: number, overallCompletion: unknown): number | null {
  if (!Number.isFinite(lessonCount) || lessonCount <= 0) return null;
  const value = typeof overallCompletion === "number" ? overallCompletion : NaN;
  return Number.isFinite(value) ? Math.round(Math.min(100, Math.max(0, value))) : null;
}

/** Average score is only meaningful when at least one real exam result backs it. */
export function averageMetric(examCount: number, averageScore: unknown): number | null {
  if (!Number.isFinite(examCount) || examCount <= 0) return null;
  const value = typeof averageScore === "number" ? averageScore : NaN;
  return Number.isFinite(value) ? Math.round(Math.min(100, Math.max(0, value))) : null;
}

/** Whole days since the most recent real lesson attempt, or null when there is none. */
export function daysSinceLastLesson(lessons: readonly LessonStamp[], now: number = Date.now()): number | null {
  let latest = -Infinity;
  for (const lesson of lessons) {
    const time = lesson.lastAttempted ? Date.parse(lesson.lastAttempted) : NaN;
    if (Number.isFinite(time) && time > latest) latest = time;
  }
  if (latest === -Infinity) return null;
  return Math.max(0, Math.floor((now - latest) / 86_400_000));
}

export function welcomeLine(opts: { hour: number; loading: boolean; daysSinceLesson: number | null }): string {
  const tod = opts.hour < 12 ? "Good morning" : opts.hour < 17 ? "Good afternoon" : "Good evening";
  if (opts.loading) return `${tod}, welcome back`;
  if (opts.daysSinceLesson !== null && opts.daysSinceLesson >= 2) return "Welcome back — let's pick up where you left off.";
  return `${tod}.`;
}

/**
 * True only when we can positively say the learner has not started: no lesson
 * attempts, no exam results and nothing recommended yet. While data is still
 * loading or failed we make no claim either way.
 */
export function isNewLearner(input: {
  loaded: boolean;
  lessonCount: number;
  examCount: number;
  recommendationCount: number;
}): boolean {
  return input.loaded && input.lessonCount === 0 && input.examCount === 0 && input.recommendationCount === 0;
}
