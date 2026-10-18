import { describe, expect, it } from "vitest";
import { isValidGeneratedPaper } from "./paperValidation";
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
