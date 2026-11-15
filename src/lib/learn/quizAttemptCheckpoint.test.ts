import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({
  get: vi.fn(),
  upsert: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/lib/local-first/store", () => ({
  localFirstStore: store,
}));

import {
  clearQuizAttemptCheckpoint,
  getQuizAttemptCheckpoint,
  sanitizeQuizQuestions,
  saveQuizAttemptCheckpoint,
} from "./quizAttemptCheckpoint";

const questions = [{
  id: 1,
  question: "What is acceleration?",
  options: ["A", "B", "C", "D"],
  correctIndex: 2,
  explanation: "Change in velocity per unit time.",
}];

describe("quiz attempt checkpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.get.mockResolvedValue(null);
    store.upsert.mockResolvedValue(undefined);
    store.remove.mockResolvedValue(undefined);
  });

  it("strips server answer keys before questions are stored locally", () => {
    expect(sanitizeQuizQuestions(questions)).toEqual([{
      id: 1,
      question: "What is acceleration?",
      options: ["A", "B", "C", "D"],
      explanation: "Change in velocity per unit time.",
    }]);
  });

  it("stores a checkpoint under a learner- and lesson-scoped identity", async () => {
    await saveQuizAttemptCheckpoint("learner-a", {
      attemptId: "attempt-a",
      lessonId: "lesson-a",
      questions,
      answers: [],
      current: 0,
      selected: 1,
      confirmed: true,
      updatedAt: new Date(0).toISOString(),
    });

    expect(store.upsert).toHaveBeenCalledWith(expect.objectContaining({
      id: "quiz_attempt_checkpoint:learner-a:lesson-a",
      entity: "study_state",
      userId: "learner-a",
      payload: expect.objectContaining({
        attemptId: "attempt-a",
        questions: [expect.not.objectContaining({ correctIndex: expect.anything() })],
      }),
    }));
  });

  it("rejects invalid answer selections before writing", async () => {
    await expect(saveQuizAttemptCheckpoint("learner-a", {
      attemptId: "attempt-a",
      lessonId: "lesson-a",
      questions,
      answers: [9],
      current: 0,
      selected: null,
      confirmed: false,
      updatedAt: new Date(0).toISOString(),
    })).rejects.toThrow("invalid answers");
    expect(store.upsert).not.toHaveBeenCalled();
  });

  it("never returns another learner's checkpoint", async () => {
    store.get.mockResolvedValue({
      userId: "learner-b",
      payload: {
        attemptId: "attempt-b",
        lessonId: "lesson-a",
        questions: sanitizeQuizQuestions(questions),
        answers: [],
        current: 0,
        selected: null,
        confirmed: false,
        updatedAt: new Date(0).toISOString(),
      },
    });

    await expect(getQuizAttemptCheckpoint("learner-a", "lesson-a")).resolves.toBeNull();
  });

  it("clears only the selected learner's lesson checkpoint", async () => {
    await clearQuizAttemptCheckpoint("learner-a", "lesson-a");
    expect(store.remove).toHaveBeenCalledWith({
      id: "quiz_attempt_checkpoint:learner-a:lesson-a",
      entity: "study_state",
      userId: "learner-a",
    });
  });
});
