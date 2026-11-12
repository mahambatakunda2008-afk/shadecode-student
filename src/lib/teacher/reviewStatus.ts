/**
 * What learners see for reviewed content. A teacher marks an item Correct, Wrong answer, Ambiguous or Out of syllabus.
 * It counts as "Teacher verified" only when at least one teacher marked it Correct and nobody has flagged it.
 */
export interface ReviewRow {
  question_id: string;
  verdict: string;
}

export interface ReviewStatus {
  verified: boolean;
  reviewers: number;
}

export function summarizeReviews(rows: ReviewRow[]): Map<string, ReviewStatus> {
  const tally = new Map<string, { correct: number; flagged: number }>();
  for (const row of rows) {
    const t = tally.get(row.question_id) ?? { correct: 0, flagged: 0 };
    if (row.verdict === "correct") t.correct += 1;
    else t.flagged += 1;
    tally.set(row.question_id, t);
  }
  const out = new Map<string, ReviewStatus>();
  for (const [id, t] of tally) out.set(id, { verified: t.correct >= 1 && t.flagged === 0, reviewers: t.correct });
  return out;
}

export const NOT_VERIFIED: ReviewStatus = { verified: false, reviewers: 0 };
