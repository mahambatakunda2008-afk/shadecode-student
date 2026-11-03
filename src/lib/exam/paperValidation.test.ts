import { describe, expect, it } from "vitest";
import { expectedPaperLength, isValidGeneratedPaper } from "./paperValidation";
import type { ExamQuestion } from "./types";

function question(overrides: Partial<ExamQuestion> = {}): ExamQuestion {
  return {
    id: 1,
    type: "short_answer",
    question: "Explain how wave frequency affects the period.",
    marks: 3,
    topic: "Waves",
    modelAnswer: "Frequency and period are reciprocals.",
    ...overrides,
  };
}

describe("isValidGeneratedPaper", () => {
  it("accepts a complete paper with the requested count", () => {
    expect(isValidGeneratedPaper([
      question({ id: 1 }),
      question({ id: 2, question: "Describe one effect of diffraction." }),
    ], 2)).toBe(true);
  });

  it("rejects a paper with the wrong question count", () => {
    expect(isValidGeneratedPaper([question()], 2)).toBe(false);
  });

  it("rejects duplicate IDs and duplicate question text", () => {
    expect(isValidGeneratedPaper([
      question({ id: 1 }),
      question({ id: 1, question: "Describe one effect of diffraction." }),
    ], 2)).toBe(false);

    expect(isValidGeneratedPaper([
      question({ id: 1 }),
      question({ id: 2, question: "EXPLAIN how wave frequency affects the period!" }),
    ], 2)).toBe(false);
  });

  it("rejects invalid marks, missing topics, and unusable question text", () => {
    expect(isValidGeneratedPaper([question({ marks: 0 })], 1)).toBe(false);
    expect(isValidGeneratedPaper([question({ topic: " " })], 1)).toBe(false);
    expect(isValidGeneratedPaper([question({ question: "short" })], 1)).toBe(false);
  });

  it("rejects multiple-choice questions without at least two usable options", () => {
    expect(isValidGeneratedPaper([
      question({ type: "multiple_choice", options: ["A"] }),
    ], 1)).toBe(false);
    expect(isValidGeneratedPaper([
      question({ type: "multiple_choice", options: ["A", " "] }),
    ], 1)).toBe(false);
  });

  it("rejects unsupported question types and non-array payloads", () => {
    expect(isValidGeneratedPaper([question({ type: "true_false" as ExamQuestion["type"] })], 1)).toBe(false);
    expect(isValidGeneratedPaper({ questions: [question()] }, 1)).toBe(false);
  });
});

describe("expectedPaperLength", () => {
  const five = [1, 2, 3, 4, 5];
  it("requires live papers to match the request exactly", () => {
    expect(expectedPaperLength("live", five, 10)).toBe(10);
  });
  it("accepts a smaller built-in practice set at its real size", () => {
    expect(expectedPaperLength("fallback", five, 20)).toBe(5);
    expect(expectedPaperLength("offline", five, 10)).toBe(5);
  });
  it("still demands the requested size when a fallback is empty or oversized", () => {
    expect(expectedPaperLength("fallback", [], 10)).toBe(10);
    expect(expectedPaperLength("fallback", [...five, 6, 7], 5)).toBe(5);
    expect(expectedPaperLength("fallback", null, 10)).toBe(10);
  });
});
