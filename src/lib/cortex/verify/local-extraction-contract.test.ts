import { describe, expect, it } from "vitest";
import { validateLocalVerifyExtraction } from "./local-extraction-contract";

const validResult = {
  rawText: "2x + 3 = 7",
  confidence: 0.96,
  warnings: [],
  platform: "android",
  engine: "Google ML Kit Text Recognition",
  engineVersion: "16.0.1",
  language: "en",
  regions: [{
    id: "page-0-region-0",
    page: 0,
    bounds: { x: 0.1, y: 0.2, width: 0.7, height: 0.12 },
    text: "2x + 3 = 7",
    confidence: 0.96,
  }],
};

describe("validateLocalVerifyExtraction", () => {
  it("normalizes valid local OCR output and preserves region provenance", () => {
    const result = validateLocalVerifyExtraction(validResult);
    expect(result.execution).toBe("local");
    expect(result.sourceStored).toBe(false);
    expect(result.rawText).toBe("2x + 3 = 7");
    expect(result.regions[0]).toMatchObject({
      id: "page-0-region-0",
      page: 0,
      text: "2x + 3 = 7",
      bounds: validResult.regions[0].bounds,
    });
  });

  it("rejects invalid platform identifiers", () => {
    expect(() => validateLocalVerifyExtraction({ ...validResult, platform: "server" }))
      .toThrow(/unsupported platform/i);
  });

  it("rejects out-of-page region geometry", () => {
    const result = {
      ...validResult,
      regions: [{ ...validResult.regions[0], bounds: { x: 0.8, y: 0.2, width: 0.4, height: 0.1 } }],
    };
    expect(() => validateLocalVerifyExtraction(result)).toThrow(/invalid bounds/i);
  });

  it("accepts an unavailable confidence score without inventing one", () => {
    const result = validateLocalVerifyExtraction({ ...validResult, confidence: null });
    expect(result.confidence).toBeNull();
  });

  it("rejects invalid confidence rather than silently clamping it", () => {
    expect(() => validateLocalVerifyExtraction({ ...validResult, confidence: 1.4 }))
      .toThrow(/confidence/i);
  });

  it("rejects malformed source regions", () => {
    expect(() => validateLocalVerifyExtraction({ ...validResult, regions: [{ id: "bad" }] }))
      .toThrow(/source region/i);
  });
});
