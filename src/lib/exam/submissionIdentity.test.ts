import { describe, expect, it } from "vitest";
import { hashExamSubmission, type ExamSubmissionIdentityInput } from "./submissionIdentity";

const base: ExamSubmissionIdentityInput = {
  userId: "student-1",
  attemptId: "exam:attempt-1",
  subject: "Mathematics",
  subjectId: "subject-1",
  difficulty: "medium",
  paperProof: "signed-paper-proof",
  questions: [
    { id: 1, question: "2 + 2?", marks: 1, modelAnswer: "4" },
  ],
  answers: [{ questionId: 1, answer: "4", timeSpent: 12 }],
  timeTaken: 12,
};

describe("verified exam submission identity", () => {
  it("is stable when object key order changes", () => {
    const reordered = {
      ...base,
      questions: [{ modelAnswer: "4", marks: 1, question: "2 + 2?", id: 1 }],
      answers: [{ timeSpent: 12, answer: "4", questionId: 1 }],
    };
    expect(hashExamSubmission(reordered)).toBe(hashExamSubmission(base));
  });

  it("changes when the learner, attempt, signed paper, or answers change", () => {
    const original = hashExamSubmission(base);
    expect(hashExamSubmission({ ...base, userId: "student-2" })).not.toBe(original);
    expect(hashExamSubmission({ ...base, attemptId: "exam:attempt-2" })).not.toBe(original);
    expect(hashExamSubmission({ ...base, paperProof: "another-proof" })).not.toBe(original);
    expect(hashExamSubmission({ ...base, answers: [{ questionId: 1, answer: "5", timeSpent: 12 }] })).not.toBe(original);
  });

  it("always produces a SHA-256 hex digest", () => {
    expect(hashExamSubmission(base)).toMatch(/^[a-f0-9]{64}$/);
  });
});
