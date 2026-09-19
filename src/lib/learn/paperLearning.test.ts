import { describe, expect, it } from "vitest";
import {
  applyQuestionCorrections,
  buildPaperSourceText,
  extractTopLevelQuestionsFromPages,
  normalizePageRange,
  selectPaperQuestions,
  type PaperQuestion,
} from "./paperLearning";

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

  it("preserves an explicit empty-text warning instead of inventing a page", () => {
    expect(buildPaperSourceText([{ pageNumber: 3, text: "", textHash: "x", visual: { width: 612, height: 792, imageCount: 0, vectorGraphicCount: 0, hasVisualContent: false } }]))
      .toContain("[No selectable text extracted. The page may contain an image, scan, or diagram.]");
  });

  it("surfaces detected visual content without pretending to understand the pixels", () => {
    const source = buildPaperSourceText([{
      pageNumber: 5,
      text: "A particle moves.",
      textHash: "x",
      visual: {
        width: 612,
        height: 792,
        imageCount: 1,
        vectorGraphicCount: 4,
        hasVisualContent: true,
      },
    }]);
    expect(source).toContain("VISUAL CONTENT DETECTED");
    expect(source).toContain("1 embedded image operation(s)");
    expect(source).toContain("Do not invent what it contains");
  });
});

describe("paper learning question selection", () => {
  const questions = [
    { questionNumber: "1", questionText: "Algebra" },
    { questionNumber: "2", questionText: "Functions" },
    { questionNumber: "3", questionText: "Trigonometry" },
  ];

  it("selects only requested top-level questions and preserves order", () => {
    expect(selectPaperQuestions(questions, ["3", "1"])).toEqual({
      selected: [questions[0], questions[2]],
      requestedNumbers: ["3", "1"],
      missingNumbers: [],
    });
  });

  it("reports requested questions that cannot be traced", () => {
    expect(selectPaperQuestions(questions, ["2", "9"])).toEqual({
      selected: [questions[1]],
      requestedNumbers: ["2", "9"],
      missingNumbers: ["9"],
    });
  });

  it("treats an empty selection as full-page scope", () => {
    expect(selectPaperQuestions(questions, [])).toEqual({
      selected: questions,
      requestedNumbers: [],
      missingNumbers: [],
    });
  });
});

describe("paper learning source correction", () => {
  it("accepts a valid correction while leaving the original object unchanged", () => {
    const original: PaperQuestion[] = [{
      questionNumber: "3",
      sourcePageStart: 2,
      sourcePageEnd: 2,
      questionText: "Calculate the resistance.",
      extractionMethod: "deterministic-top-level-numbering",
      extractionConfidence: 0.91,
      marks: 2,
    }];
    const result = applyQuestionCorrections(original, [{ questionNumber: "3", correctedText: "Calculate the resistance of the wire." }]);
    expect(result.appliedNumbers).toEqual(["3"]);
    expect(result.invalidNumbers).toEqual([]);
    expect(result.questions[0].questionText).toBe("Calculate the resistance of the wire.");
    expect(original[0].questionText).toBe("Calculate the resistance.");
  });

  it("rejects corrections for questions outside the extracted index", () => {
    const original = [{ questionNumber: "1", questionText: "Known question" }];
    const result = applyQuestionCorrections(original, [{ questionNumber: "9", correctedText: "Unknown question" }]);
    expect(result.invalidNumbers).toEqual(["9"]);
    expect(result.appliedNumbers).toEqual([]);
    expect(result.questions).toEqual(original);
  });

  it("ignores empty and overlong corrections rather than replacing source text", () => {
    const original = [{ questionNumber: "1", questionText: "Known question" }];
    const result = applyQuestionCorrections(original, [
      { questionNumber: "1", correctedText: " " },
      { questionNumber: "1", correctedText: "x".repeat(6001) },
    ]);
    expect(result.appliedNumbers).toEqual([]);
    expect(result.questions).toEqual(original);
  });
});
