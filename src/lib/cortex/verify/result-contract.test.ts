import { describe, expect, it } from "vitest";
import { isValidVerifyMarkResult } from "./result-contract";

const valid = {
  problem: "Find the acceleration.",
  confidence: 0.8,
  score: 75,
  correct: false,
  cortexInsight: "Your method is mostly correct, but one step needs attention.",
  steps: [{ description: "Apply the equation", status: "correct", note: "" }],
  feedback: "Check the substitution in the final line before evaluating the answer.",
  marksBreakdown: [{ criterion: "Substitution", marksLost: 1, note: "A value was copied incorrectly." }],
};

describe("isValidVerifyMarkResult", () => {
  it("accepts a complete bounded Mark Mode result", () => {
    expect(isValidVerifyMarkResult(valid)).toBe(true);
  });

  it("rejects scores outside the percentage range", () => {
    expect(isValidVerifyMarkResult({ ...valid, score: 120 })).toBe(false);
    expect(isValidVerifyMarkResult({ ...valid, score: -1 })).toBe(false);
  });

  it("rejects missing reasoning and malformed steps", () => {
    expect(isValidVerifyMarkResult({ ...valid, steps: [] })).toBe(false);
    expect(isValidVerifyMarkResult({ ...valid, steps: [{ description: "x", status: "unknown", note: "" }] })).toBe(false);
  });

  it("rejects malformed mark breakdown and confidence", () => {
    expect(isValidVerifyMarkResult({ ...valid, marksBreakdown: [{ criterion: "Method", marksLost: -2, note: "" }] })).toBe(false);
    expect(isValidVerifyMarkResult({ ...valid, confidence: 2 })).toBe(false);
  });

  it("requires a retake explanation when the image cannot be read", () => {
    expect(isValidVerifyMarkResult({ ...valid, needsRetake: true })).toBe(false);
    expect(isValidVerifyMarkResult({ ...valid, needsRetake: true, retakeReason: "The image is blurred." })).toBe(true);
  });
});
