import { describe, expect, it } from "vitest";
import { PUBLIC_LESSON_QUIZ_COLUMNS, toPublicLessonQuizResult } from "./publicResult";

const q = (correctIndex: number) => ({ id: 1, question: "SECRET QUESTION", options: ["a", "b", "c", "d"], correctIndex, explanation: "SECRET EXPLANATION" });
const attempt = {
  status: "completed",
  questions: [q(0), q(1), q(2), q(3)],
  answers: [0, 1, 0, 0],
  completed_at: "2026-11-13T09:00:00.000Z",
};

describe("toPublicLessonQuizResult", () => {
  it("recomputes the score from the server answer key", () => {
    expect(toPublicLessonQuizResult(attempt, "Physics")).toEqual({
      subject: "Physics", topic: null, difficulty: "Lesson quiz", percentage: 50, correct: 2,
      total: 4, grade: "D", timeSeconds: null, completedAt: "2026-11-13T09:00:00.000Z",
    });
  });
  it("never leaks questions, answers or ids", () => {
    const json = JSON.stringify(toPublicLessonQuizResult({ ...attempt, user_id: "u-1", result: { x: 1 } } as never, "Physics"));
    for (const secret of ["SECRET", "u-1", "questions", "answers", "correctIndex"]) expect(json).not.toContain(secret);
  });
  it("only serves completed attempts", () => {
    expect(toPublicLessonQuizResult({ ...attempt, status: "issued" }, "Physics")).toBeNull();
    expect(toPublicLessonQuizResult({ ...attempt, status: "processing" }, "Physics")).toBeNull();
  });
  it("rejects malformed rows and missing subject", () => {
    expect(toPublicLessonQuizResult(null, "Physics")).toBeNull();
    expect(toPublicLessonQuizResult({ ...attempt, answers: [0] }, "Physics")).toBeNull();
    expect(toPublicLessonQuizResult({ ...attempt, questions: [], answers: [] }, "Physics")).toBeNull();
    expect(toPublicLessonQuizResult(attempt, "  ")).toBeNull();
    expect(toPublicLessonQuizResult(attempt, undefined)).toBeNull();
  });
  it("selects no private columns", () => {
    expect(PUBLIC_LESSON_QUIZ_COLUMNS).not.toMatch(/user_id|result\b/);
  });
});
