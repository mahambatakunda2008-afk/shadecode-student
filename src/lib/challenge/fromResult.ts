/**
 * src/lib/challenge/fromResult.ts
 *
 * Builds a challenge from the learner's own saved `exam_results` row so the
 * score a challenge advertises is read from the database, never from the
 * browser. (`exam_results.score` stores the exam percentage.)
 */

export interface ExamResultRow {
  subject?: unknown;
  topic?: unknown;
  difficulty?: unknown;
  score?: unknown;
  total_questions?: unknown;
  correct_answers?: unknown;
  time_taken?: unknown;
}

export interface ChallengeFields {
  subject: string;
  topic: string | null;
  difficulty: string;
  question_count: number;
  percentage: number;
  total_score: number;
  max_score: number;
  time_taken: number | null;
  grade: string;
}

export function gradeForPercentage(p: number): string {
  return p >= 90 ? "A*" : p >= 80 ? "A" : p >= 70 ? "B" : p >= 60 ? "C" : p >= 50 ? "D" : p >= 40 ? "E" : "U";
}

const finite = (value: unknown): number | null => {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
};

export function challengeFromResult(row: ExamResultRow | null | undefined): ChallengeFields | null {
  if (!row || typeof row.subject !== "string" || !row.subject.trim()) return null;

  const percentage = finite(row.score);
  const questionCount = finite(row.total_questions);
  if (percentage === null || percentage < 0 || percentage > 100) return null;
  if (questionCount === null || !Number.isInteger(questionCount) || questionCount < 1 || questionCount > 20) return null;

  const correct = finite(row.correct_answers);
  const timeTaken = finite(row.time_taken);

  return {
    subject: row.subject.trim().slice(0, 80),
    topic: typeof row.topic === "string" && row.topic.trim() ? row.topic.trim().slice(0, 160) : null,
    difficulty: typeof row.difficulty === "string" && row.difficulty.trim() ? row.difficulty.trim().slice(0, 40) : "Standard",
    question_count: questionCount,
    percentage: Math.round(percentage),
    total_score: correct !== null && correct >= 0 && correct <= questionCount ? Math.round(correct) : Math.round((percentage / 100) * questionCount),
    max_score: questionCount,
    time_taken: timeTaken !== null && timeTaken >= 0 ? Math.round(timeTaken) : null,
    grade: gradeForPercentage(percentage),
  };
}
