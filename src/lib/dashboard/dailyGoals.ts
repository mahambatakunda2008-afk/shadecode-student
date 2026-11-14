/**
 * src/lib/dashboard/dailyGoals.ts
 *
 * Today's goals, derived ONLY from data the student already has: lessons they
 * started, exams they saved, and Cortex recommendations. Nothing is typed in,
 * nothing is invented. A goal disappears on its own when the data says it is
 * done (lesson completed, exam passed), so there is nothing to tick off.
 */

export type DailyGoalKind = "exam_prep" | "finish_lesson" | "recommended";

export interface DailyGoal {
  id: string;
  kind: DailyGoalKind;
  title: string;
  detail: string;
  actionLabel: string;
  href: string;
  subject?: string;
}

export interface GoalLesson {
  lessonId: string;
  lessonTitle: string;
  subject: string;
  progress: number;
  completed?: boolean;
  lastAttempted?: string | null;
}
export interface GoalExam {
  id: string;
  subject: string;
  exam_date: string; // YYYY-MM-DD
}
export interface GoalRecommendation {
  id?: string;
  title?: string;
  description?: string;
  reason?: string;
  subject?: string;
  topic?: string;
  estimatedTime?: number;
}

export interface BuildGoalsInput {
  lessons: readonly GoalLesson[];
  exams: readonly GoalExam[];
  /** Cortex recommendations AFTER the hero's one, used to fill remaining slots. */
  recommendations: readonly GoalRecommendation[];
  now?: Date;
  limit?: number;
}

export const EXAM_PREP_WINDOW_DAYS = 21;
export const URGENT_EXAM_DAYS = 7;

const DAY_MS = 86_400_000;
const norm = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : "");

/** Whole calendar days from `now` (local) to a YYYY-MM-DD exam date; null if unparseable. */
export function daysUntilExam(examDate: string, now: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(examDate);
  if (!m) return null;
  const exam = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (Number.isNaN(exam.getTime())) return null;
  return Math.round((exam.getTime() - today.getTime()) / DAY_MS);
}

function when(days: number): string {
  return days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
}

export function buildDailyGoals({ lessons, exams, recommendations, now = new Date(), limit = 3 }: BuildGoalsInput): DailyGoal[] {
  const urgent: DailyGoal[] = [];
  const soon: DailyGoal[] = [];
  const started: DailyGoal[] = [];
  const filler: DailyGoal[] = [];

  // 1) The nearest exam per subject inside the prep window.
  const seenSubjects = new Set<string>();
  const upcoming = exams
    .map((exam) => ({ exam, days: daysUntilExam(exam.exam_date, now) }))
    .filter((e): e is { exam: GoalExam; days: number } => e.days !== null && e.days >= 0 && e.days <= EXAM_PREP_WINDOW_DAYS)
    .sort((a, b) => a.days - b.days);
  for (const { exam, days } of upcoming) {
    const key = norm(exam.subject);
    if (!key || seenSubjects.has(key)) continue;
    seenSubjects.add(key);
    const goal: DailyGoal = {
      id: `exam-${exam.id}`,
      kind: "exam_prep",
      title: `${exam.subject} exam ${when(days)}`,
      detail: "Take a 10-question practice paper to find your gaps.",
      actionLabel: "Practise",
      href: `/exam-sim?subject=${encodeURIComponent(exam.subject)}&count=10`,
      subject: exam.subject,
    };
    (days <= URGENT_EXAM_DAYS ? urgent : soon).push(goal);
  }

  // 2) The lesson they left half-finished most recently.
  const unfinished = lessons
    .filter((l) => !l.completed && l.progress > 0 && l.progress < 100 && l.lessonId && l.lessonTitle)
    .sort((a, b) => (Date.parse(b.lastAttempted ?? "") || 0) - (Date.parse(a.lastAttempted ?? "") || 0));
  const lesson = unfinished[0];
  const startedTitles = new Set<string>();
  if (lesson) {
    startedTitles.add(norm(lesson.lessonTitle));
    started.push({
      id: `lesson-${lesson.lessonId}`,
      kind: "finish_lesson",
      title: `Finish ${lesson.lessonTitle}`,
      detail: `${lesson.subject} · ${Math.round(lesson.progress)}% done`,
      actionLabel: "Continue",
      href: `/learn/${encodeURIComponent(lesson.lessonId)}`,
      subject: lesson.subject,
    });
  }

  // 3) Cortex recommendations fill any remaining slots (never repeating the above).
  for (const rec of recommendations) {
    const title = rec.title?.trim();
    if (!title) continue;
    const topic = (rec.topic || title).trim();
    if (startedTitles.has(norm(topic)) || startedTitles.has(norm(title))) continue;
    const params = new URLSearchParams();
    if (rec.subject) params.set("subject", rec.subject);
    params.set("topic", topic);
    filler.push({
      id: `rec-${rec.id ?? norm(title)}`,
      kind: "recommended",
      title,
      detail: rec.description || rec.reason || "",
      actionLabel: rec.estimatedTime ? `${rec.estimatedTime} min` : "Start",
      href: `/learn?${params.toString()}`,
      subject: rec.subject,
    });
  }

  return [...urgent, ...started, ...soon, ...filler].slice(0, Math.max(0, limit));
}
