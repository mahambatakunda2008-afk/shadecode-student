import { describe, expect, it } from "vitest";
import { mapOfflineExamQuestions } from "./offlineQuestions";

describe("mapOfflineExamQuestions", () => {
  it("preserves structured content and all optional question data in offline papers", () => {
    const content = [
      { type: "table" as const, caption: "Results", headers: ["Time / s", "Distance / m"], rows: [["0", "0"], ["2", "8"]] },
      { type: "graph" as const, xLabel: "Time / s", yLabel: "Distance / m", points: [{ x: 0, y: 0 }, { x: 2, y: 8 }] },
      { type: "diagram" as const, shapes: [{ type: "line" as const, x1: 0, y1: 0, x2: 10, y2: 10 }] },
    ];
    const questions = mapOfflineExamQuestions([{
      id: "generated-17",
      type: "structured",
      question: "Use the information provided to analyse the experiment and explain the relationship.",
      marks: 4,
      topic: "Motion",
      difficulty: "medium",
      modelAnswer: "The distance increases uniformly with time.",
      markingCriteria: "Award marks for trend, evidence and explanation.",
      numeric: { exact: 4, tolerance: 0 },
      content,
    }]);

    expect(questions).toHaveLength(1);
    expect(questions[0]).toMatchObject({
      id: 1,
      type: "structured",
      modelAnswer: "The distance increases uniformly with time.",
      numeric: { exact: 4, tolerance: 0 },
      content,
    });
  });

  it("assigns stable sequential numeric IDs without mutating source questions", () => {
    const source = [
      { id: "first", type: "short_answer" as const, question: "Explain one relevant consequence of the change.", marks: 2, topic: "Biology", difficulty: "easy" as const },
      { id: "second", type: "essay" as const, question: "Discuss the evidence and evaluate the proposed conclusion.", marks: 5, topic: "Biology", difficulty: "hard" as const },
    ];
    const mapped = mapOfflineExamQuestions(source);
    expect(mapped.map((question) => question.id)).toEqual([1, 2]);
    expect(source.map((question) => question.id)).toEqual(["first", "second"]);
  });
});
