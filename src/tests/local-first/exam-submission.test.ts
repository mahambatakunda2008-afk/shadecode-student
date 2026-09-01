import { describe, expect, it, vi } from "vitest";
import { submitExamOffline } from "@/lib/local-first/exam-submission";
import type { LocalExamAttempt } from "@/lib/local-first/exam-attempt";

vi.mock("@/lib/local-first/exam-attempt", () => ({ saveExamAttempt: vi.fn() }));
vi.mock("@/lib/local-first/exam-submission-queue", () => ({ queueExamSubmission: vi.fn(async () => ({ id: "queued" })) }));
vi.mock("@/lib/local-first/exam-result", () => ({
  submitExamLocally: vi.fn(async (input: { attemptId: string; subject: string; topic?: string; level: string; questions: typeof questions; answers: typeof attempt.answers; timeTaken: number }) => ({
    id: `exam_result:${input.attemptId}`,
    userId: "user-1",
    entity: "exam_result",
    payload: {
      totalScore: 1,
      maxScore: 3,
      percentage: 33,
      grade: "U",
      weakAreas: ["Reasoning"],
      strongAreas: [],
      cortexInsight: "Written answers remain queued for deeper marking.",
      results: [
        { questionId: 1, score: 1, maxScore: 1, correct: true, feedback: "Correct.", modelAnswer: "4", topic: "Arithmetic" },
        { questionId: 2, score: 0, maxScore: 2, correct: false, feedback: "Saved for marking.", modelAnswer: "A reason", topic: "Reasoning" },
      ],
      timeTaken: input.timeTaken,
      source: "local-deterministic" as const,
      attemptId: input.attemptId,
      subject: input.subject,
      topic: input.topic,
      level: input.level,
      questions: input.questions,
      answers: input.answers,
      pendingServerMark: true,
      submittedAt: "2026-08-31T08:00:20.000Z",
    },
  })),
}));

const questions = [
  { id: 1, type: "multiple_choice" as const, question: "2 + 2?", options: ["3", "4"], marks: 1, topic: "Arithmetic", modelAnswer: "4" },
  { id: 2, type: "short_answer" as const, question: "Explain why.", marks: 2, topic: "Reasoning", modelAnswer: "A reason" },
];

const attempt: LocalExamAttempt = {
  attemptId: "attempt-1",
  userId: "user-1",
  subject: "Mathematics",
  topic: "Arithmetic",
  level: 1,
  count: questions.length,
  questions: questions.map(({ modelAnswer: _modelAnswer, ...question }) => question),
  answers: [{ questionId: 1, answer: "4", timeSpent: 5 }, { questionId: 2, answer: "Because", timeSpent: 10 }],
  current: 0,
  seconds: 100,
  totalSeconds: 120,
  flags: [],
  canvas: "",
  status: "active",
  startedAt: Date.parse("2026-08-31T08:00:00.000Z"),
  updatedAt: "2026-08-31T08:00:10.000Z",
};

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
