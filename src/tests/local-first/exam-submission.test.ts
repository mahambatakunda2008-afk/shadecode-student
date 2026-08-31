import { describe, expect, it, vi } from "vitest";
import { submitExamOffline } from "@/lib/local-first/exam-submission";

vi.mock("@/lib/local-first/exam-attempt", () => ({ saveExamAttempt: vi.fn() }));
vi.mock("@/lib/local-first/exam-result", () => ({ saveExamResult: vi.fn() }));

const attempt = {
  attemptId: "attempt-1",
  userId: "user-1",
  subject: "Mathematics",
  topic: "Arithmetic",
  level: "A-Level",
  questions: [],
  answers: [{ questionId: 1, answer: "4", timeSpent: 5 }, { questionId: 2, answer: "Because", timeSpent: 10 }],
  currentQuestion: 0,
  remainingSeconds: 100,
  totalSeconds: 120,
  flags: [],
  canvasState: "",
  status: "active" as const,
  startedAt: "2026-08-31T08:00:00.000Z",
  updatedAt: "2026-08-31T08:00:10.000Z",
};

const questions = [
  { id: 1, type: "multiple_choice" as const, question: "2 + 2?", options: ["3", "4"], marks: 1, topic: "Arithmetic", modelAnswer: "4" },
  { id: 2, type: "short_answer" as const, question: "Explain why.", marks: 2, topic: "Reasoning", modelAnswer: "A reason" },
];

describe("submitExamOffline", () => {
  it("marks safe objective work, persists a submitted attempt and result", async () => {
    const result = await submitExamOffline(attempt, questions);
    expect(result.totalScore).toBe(1);
    expect(result.maxScore).toBe(3);
    expect(result.source).toBe("local-deterministic");
    expect(result.results).toHaveLength(2);
  });

  it("rejects a second submission", async () => {
    await expect(submitExamOffline({ ...attempt, status: "submitted" }, questions)).rejects.toThrow("already been submitted");
  });
});
