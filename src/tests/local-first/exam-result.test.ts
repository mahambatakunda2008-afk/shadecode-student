import { describe, expect, it, vi } from "vitest";
import { markExamOffline } from "@/lib/local-first/exam-marker";

const questions = [
  { id: 1, type: "multiple_choice" as const, question: "2 + 2?", options: ["3", "4"], marks: 1, topic: "Arithmetic", modelAnswer: "4" },
  { id: 2, type: "short_answer" as const, question: "Explain why.", marks: 2, topic: "Reasoning", modelAnswer: "A reason" },
];

describe("offline exam marking", () => {
  it("marks objective answers and leaves written work pending", () => {
    const result = markExamOffline(questions, [
      { questionId: 1, answer: "4", timeSpent: 4 },
      { questionId: 2, answer: "Because", timeSpent: 20 },
    ], 24);

    expect(result.totalScore).toBe(1);
    expect(result.maxScore).toBe(3);
    expect(result.results[0].correct).toBe(true);
    expect(result.results[1].score).toBe(0);
    expect(result.weakAreas).toContain("Reasoning");
    expect(result.source).toBe("local-deterministic");
  });

  it("does not award credit to a blank objective answer", () => {
    const result = markExamOffline([questions[0]], [], 0);
    expect(result.totalScore).toBe(0);
    expect(result.results[0].feedback).toBe("No answer submitted.");
  });
});
