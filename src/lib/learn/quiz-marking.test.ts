import { describe, expect, it } from "vitest";
import { markLessonQuiz } from "./quiz-marking";

const questions = [
  { question: "Q1", options: ["A", "B", "C", "D"], correctIndex: 1 },
  { question: "Q2", options: ["A", "B", "C", "D"], correctIndex: 3 },
];

describe("markLessonQuiz", () => {
  it("scores against the trusted stored key, not a client-supplied correctIndex", () => {
    const result = markLessonQuiz(questions, [
      { selectedIndex: 0, correctIndex: 0 },
      { selectedIndex: 2, correctIndex: 2 },
    ]);
    expect(result).toEqual({ correctCount: 0, questionCount: 2, score: 0 });
  });

  it("calculates correct count and percentage from stored answer keys", () => {
    expect(markLessonQuiz(questions, [{ selectedIndex: 1 }, { selectedIndex: 0 }]))
      .toEqual({ correctCount: 1, questionCount: 2, score: 50 });
  });

  it("rejects missing, mismatched, or invalid answers", () => {
    expect(markLessonQuiz(questions, [{ selectedIndex: 1 }])).toBeNull();
    expect(markLessonQuiz(questions, [{ selectedIndex: 1 }, { selectedIndex: 4 }])).toBeNull();
    expect(markLessonQuiz([{ correctIndex: 9 }], [{ selectedIndex: 1 }])).toBeNull();
    expect(markLessonQuiz([], [])).toBeNull();
  });
});
