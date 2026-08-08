/**
 * src/lib/exam/scoring.ts
 *
 * Extracted from src/app/api/exam/mark/route.js so the score-clamping
 * logic can be unit tested directly, without mocking auth, rate limiting,
 * the AI provider chain, or Supabase.
 *
 * The clamp exists specifically to defend against a hallucinating AI
 * grader returning a score higher than a question's own max marks, or a
 * negative score -- without it, percentage could exceed 100% or go
 * negative, corrupting grade and Cortex weak/strong-area tracking
 * downstream. Flagged as an outstanding risk in
 * docs/FINAL_AUDIT_REPORT_2026-08.md; this module + its tests close it.
 */

export interface ExamQuestion {
  id: string | number;
  marks: number;
  topic?: string;
  [key: string]: unknown;
}

export interface ExamMarkResult {
  questionId: string | number;
  score: number;
  maxScore?: number;
  correct?: boolean;
  feedback?: string;
  modelAnswer?: string;
  topic?: string;
}

export interface ExamScoreSummary {
  totalScore: number;
  maxScore: number;
  percentage: number;
  grade: string;
}

/**
 * Clamps a single raw score into [0, max] (or just [0, ∞) if max is
 * unknown). Shared by calculateExamScore and computeTopicScores so the
 * hallucinating-grader defense lives in exactly one place.
 */
function clampScore(rawScore: number, maxForQuestion: number | undefined): number {
  const safeRaw = rawScore || 0;
  return maxForQuestion !== undefined
    ? Math.max(0, Math.min(safeRaw, maxForQuestion))
    : Math.max(0, safeRaw);
}

/**
 * Converts a percentage into a letter grade. UK-style boundaries,
 * matching Cambridge/ZIMSEC conventions this platform targets.
 */
export function getGrade(percentage: number): string {
  if (percentage >= 90) return "A*";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  if (percentage >= 40) return "E";
  return "U";
}

/**
 * Sums an AI grader's per-question results into a total, clamping each
 * question's score into [0, question.marks] before summing so a
 * hallucinating or malformed AI response can't push the total above
 * 100% or below 0%.
 *
 * If a result references a questionId that doesn't exist in `questions`
 * (AI invented one, or IDs mismatched), that result's max is unknown --
 * clamp only the floor (no negative scores) rather than silently
 * dropping the result, since dropping would also silently lower the
 * displayed maxScore in a way that's hard to detect from the outside.
 */
export function calculateExamScore(
  questions: ExamQuestion[],
  results: ExamMarkResult[]
): ExamScoreSummary {
  const questionMarksById = new Map(questions.map((q) => [q.id, q.marks]));

  const totalScore = results.reduce((sum, r) => {
    return sum + clampScore(r.score, questionMarksById.get(r.questionId));
  }, 0);

  const maxScore = questions.reduce((sum, q) => sum + q.marks, 0);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const grade = getGrade(percentage);

  return { totalScore, maxScore, percentage, grade };
}

export interface TopicScoreBreakdown {
  topic: string;
  scoreEarned: number;
  scoreMax: number;
  percentage: number;
}

/**
 * Groups an exam's clamped results by question.topic and sums per
 * topic -- the input topic_mastery needs (see src/lib/topicMastery/),
 * previously computed nowhere: exam marking discarded per-topic detail
 * once the overall total was calculated. Questions with no topic set
 * are grouped under "General" rather than silently dropped.
 */
export function computeTopicScores(
  questions: ExamQuestion[],
  results: ExamMarkResult[]
): TopicScoreBreakdown[] {
  const questionById = new Map(questions.map((q) => [q.id, q]));
  const totals = new Map<string, { earned: number; max: number }>();

  results.forEach((r) => {
    const question = questionById.get(r.questionId);
    const topic = question?.topic?.trim() || "General";
    const max = question?.marks;
    const earned = clampScore(r.score, max);

    const existing = totals.get(topic) ?? { earned: 0, max: 0 };
    existing.earned += earned;
    existing.max += max ?? 0;
    totals.set(topic, existing);
  });

  return Array.from(totals.entries()).map(([topic, { earned, max }]) => ({
    topic,
    scoreEarned: earned,
    scoreMax: max,
    percentage: max > 0 ? Math.round((earned / max) * 100) : 0,
  }));
}
