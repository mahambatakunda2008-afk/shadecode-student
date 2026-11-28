import { createHash } from "node:crypto";

export interface ExamSubmissionIdentityInput {
  userId: string;
  attemptId: string;
  subject: string;
  subjectId: string;
  difficulty: string;
  paperProof: string;
  questions: unknown[];
  answers: unknown[];
  timeTaken: number;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

/**
 * Stable identity for one authenticated learner's completed, signed paper.
 * The digest includes the exact signed paper and submitted answers, so an
 * attempt ID cannot be reused to overwrite a different submission.
 */
export function hashExamSubmission(input: ExamSubmissionIdentityInput): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(input)))
    .digest("hex");
}
