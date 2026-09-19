import { describe, expect, it } from "vitest";
import {
  applyQuestionCorrections,
  buildPaperSourceText,
  extractTopLevelQuestionsFromPages,
  normalizePageRange,
  selectPaperQuestions,
  type PaperQuestion,
} from "./paperLearning";

describe("paper learning source integrity", () => {
  it("normalizes page ranges without escaping the source document", () => {
    expect(normalizePageRange(0, 99, 8)).toEqual({ start: 1, end: 8 });
    expect(normalizePageRange(5.9, 3.2, 8)).toEqual({ start: 5, end: 5 });
  });

  it("selects only requested questions and reports missing provenance", () => {
    const questions = [{ questionNumber: "1" }, { questionNumber: "2" }, { questionNumber: "4" }];
    expect(selectPaperQuestions(questions, ["2", "4", "9"])).toEqual({
      selected: [{ questionNumber: "2" }, { questionNumber: "4" }],
      requestedNumbers: ["2", "4", "9"],
      missingNumbers: ["9"],
    });
  });

  it("extracts question/page provenance conservatively", () => {
    const questions = extractTopLevelQuestionsFromPages([
      { pageNumber: 1, text: "1. Solve x + 2 = 5 [3]\n(a) Explain your method" },
      { pageNumber: 2, text: "continued working\n2) Factorise x^2 - 9 [4]" },
    ]);
    expect(questions).toHaveLength(2);
    expect(questions[0]).toMatchObject({
      questionNumber: "1",
      sourcePageStart: 1,
      sourcePageEnd: 2,
      extractionMethod: "deterministic-top-level-numbering",
      extractionConfidence: 0.96,
    });
    expect(questions[1]).toMatchObject({ questionNumber: "2", sourcePageStart: 2 });
  });

  it("preserves an explicit empty-text warning instead of inventing a page", () => {
    expect(buildPaperSourceText([{ pageNumber: 3, text: "", textHash: "x" }]))
      .toContain("[No selectable text extracted. The page may contain an image, scan, or diagram.]");
  });

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
