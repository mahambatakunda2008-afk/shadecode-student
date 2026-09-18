import { describe, expect, it } from "vitest";
import { extractTopLevelQuestionsFromPages, normalizePageRange } from "./paperLearning";

describe("paper learning page scope", () => {
  it("keeps a valid inclusive page range inside the document", () => {
    expect(normalizePageRange(1, 8, 20)).toEqual({ start: 1, end: 8 });
    expect(normalizePageRange(4, 99, 10)).toEqual({ start: 4, end: 10 });
  });

  it("repairs invalid or reversed ranges without producing an empty scope", () => {
    expect(normalizePageRange(0, 0, 10)).toEqual({ start: 1, end: 1 });
    expect(normalizePageRange(8, 3, 10)).toEqual({ start: 8, end: 8 });
    expect(normalizePageRange(99, 120, 10)).toEqual({ start: 10, end: 10 });
  });
});

describe("paper learning question provenance", () => {
  it("extracts top-level questions while preserving page spans and rejecting subparts", () => {
    const questions = extractTopLevelQuestionsFromPages([
      {
        pageNumber: 1,
        text: "1. Solve the equation.\n(a) Show that x is positive.\n[4]\n2) Explain the graph.\n2 (a) State the gradient.\n[3]",
      },
      {
        pageNumber: 2,
        text: "Continue question 2 with your reasoning.\n3. A particle moves at constant speed.\n[5]",
      },
    ]);

    expect(questions.map(question => question.questionNumber)).toEqual(["1", "2", "3"]);
    expect(questions[0]).toMatchObject({ sourcePageStart: 1, sourcePageEnd: 1, marks: 4 });
    expect(questions[1]).toMatchObject({ sourcePageStart: 1, sourcePageEnd: 2, marks: 3 });
    expect(questions[2]).toMatchObject({ sourcePageStart: 2, sourcePageEnd: 2, marks: 5 });
    expect(questions[0].questionText).not.toContain("(a)");
  });

  it("returns no fabricated questions for pages without numbering", () => {
    expect(extractTopLevelQuestionsFromPages([
      { pageNumber: 4, text: "This page contains a diagram and explanatory prose only." },
    ])).toEqual([]);
  });
});
