import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signExamPaper, verifyExamPaperProof } from "./paper-provenance";

const paper = [
  { id: "q1", question: "What is 2 + 2?", marks: 1, modelAnswer: "4", topic: "Arithmetic" },
  { id: "q2", question: "Define velocity.", marks: 2, modelAnswer: "Rate of change of displacement.", topic: "Motion" },
];
const input = {
  userId: "student-1",
  subject: "Mathematics",
  subjectId: "subject-1",
  difficulty: "easy",
  source: "curated-bank" as const,
  questions: paper,
};

describe("exam paper provenance", () => {
  const previousSecret = process.env.EXAM_PAPER_SIGNING_SECRET;
  const previousServiceSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    process.env.EXAM_PAPER_SIGNING_SECRET = "test-only-secret-with-enough-entropy";
  });

  afterEach(() => {
    if (previousSecret === undefined) delete process.env.EXAM_PAPER_SIGNING_SECRET;
    else process.env.EXAM_PAPER_SIGNING_SECRET = previousSecret;
    if (previousServiceSecret === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceSecret;
  });

  it("signs and verifies the exact paper for the authenticated student and subject", () => {
    const token = signExamPaper(input, 1_000_000);
    expect(token).toBeTruthy();
    expect(verifyExamPaperProof(token, input, 1_000_001)).toEqual({
      valid: true,
      source: "curated-bank",
      issuedAt: 1_000_000,
      expiresAt: 1_000_000 + 24 * 60 * 60 * 1000,
    });
  });

  it("is stable when object key order changes but rejects changed paper content", () => {
    const token = signExamPaper(input, 1_000_000);
    const reordered = {
      ...input,
      questions: paper.map((question) => ({
        topic: question.topic,
        modelAnswer: question.modelAnswer,
        marks: question.marks,
        question: question.question,
        id: question.id,
      })),
    };
    expect(verifyExamPaperProof(token, reordered, 1_000_001).valid).toBe(true);
    expect(verifyExamPaperProof(token, { ...input, questions: paper.map((q) => ({ ...q, modelAnswer: "tampered" })) }, 1_000_001).valid).toBe(false);
  });

  it("rejects a proof replayed for another student, subject or difficulty", () => {
    const token = signExamPaper(input, 1_000_000);
    expect(verifyExamPaperProof(token, { ...input, userId: "student-2" }, 1_000_001).valid).toBe(false);
    expect(verifyExamPaperProof(token, { ...input, subjectId: "subject-2" }, 1_000_001).valid).toBe(false);
    expect(verifyExamPaperProof(token, { ...input, subject: "Physics" }, 1_000_001).valid).toBe(false);
    expect(verifyExamPaperProof(token, { ...input, difficulty: "hard" }, 1_000_001).valid).toBe(false);
  });

  it("rejects expired, malformed and modified signatures", () => {
    const token = signExamPaper(input, 1_000_000);
    expect(verifyExamPaperProof(token, input, 1_000_000 + 24 * 60 * 60 * 1000).valid).toBe(false);
    expect(verifyExamPaperProof("not-a-token", input, 1_000_001).valid).toBe(false);
    const [payload, signature] = token!.split(".");
    const changedSignature = `${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
    expect(verifyExamPaperProof(`${payload}.${changedSignature}`, input, 1_000_001).valid).toBe(false);
  });

  it("fails closed when no server signing secret is configured", () => {
    delete process.env.EXAM_PAPER_SIGNING_SECRET;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const token = signExamPaper(input, 1_000_000);
    expect(token).toBeNull();
    expect(verifyExamPaperProof(token, input, 1_000_001).valid).toBe(false);
  });
});
