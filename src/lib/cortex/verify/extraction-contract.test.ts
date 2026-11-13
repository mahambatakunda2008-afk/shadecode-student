import { describe, expect, it } from "vitest";
import { validateVerifyExtraction } from "./extraction-contract";

describe("Cortex Verify extraction contract", () => {
  it("accepts faithful text, bounded confidence and warnings", () => {
    expect(validateVerifyExtraction({
      rawText: "Question 1\nCalculate the acceleration.",
      confidence: 0.92,
      warnings: ["Check the handwritten subscript."],
    })).toEqual({
      rawText: "Question 1\nCalculate the acceleration.",
      confidence: 0.92,
      warnings: ["Check the handwritten subscript."],
    });
  });

  it("allows a blank transcript when no readable text was found", () => {
    expect(validateVerifyExtraction({ rawText: "", confidence: 0.1, warnings: ["No readable text found."] }).rawText).toBe("");
  });

  it("rejects invalid confidence and malformed warnings", () => {
    expect(() => validateVerifyExtraction({ rawText: "Text", confidence: 1.2, warnings: [] })).toThrow();
    expect(() => validateVerifyExtraction({ rawText: "Text", confidence: 0.5, warnings: [42] })).toThrow();
  });

  it("rejects oversized extracted text", () => {
    expect(() => validateVerifyExtraction({ rawText: "x".repeat(120001), confidence: 0.5, warnings: [] })).toThrow();
  });
});
