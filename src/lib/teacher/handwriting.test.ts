import { describe, expect, it } from "vitest";
import { findHandwritingNotationWarnings, findHandwritingReviewRanges, normalizeHandwritingRecognition, parseHandwritingRecognition, shouldUseHandwritingRetry } from "./handwriting";

describe("handwriting OCR response parsing", () => {
  it("parses a strict JSON response", () => {
    expect(parseHandwritingRecognition('{"transcript":"v0ltage","correctedText":"voltage","confidence":0.96,"uncertainCharacters":[]}')).toMatchObject({
      transcript: "v0ltage",
      correctedText: "voltage",
    });
  });

  it("extracts JSON wrapped in a model markdown fence or short preamble", () => {
    expect(parseHandwritingRecognition('```json\n{"transcript":"x","correctedText":"x"}\n```')).toMatchObject({ transcript: "x" });
    expect(parseHandwritingRecognition('Result:\n{"transcript":"x","correctedText":"x"}')).toMatchObject({ transcript: "x" });
  });

  it("rejects malformed JSON, arrays and non-object responses", () => {
    expect(parseHandwritingRecognition("not json")).toBeNull();
    expect(parseHandwritingRecognition("[1,2,3]")).toBeNull();
    expect(parseHandwritingRecognition("null")).toBeNull();
  });

  it("normalizes confidence, preserves alternatives and requires review for uncertain characters", () => {
    const result = normalizeHandwritingRecognition({
      transcript: "The v0ltage is 5V",
      correctedText: "The voltage is 5V",
      confidence: 1.4,
      uncertainCharacters: [{ seen: "0/O", chosen: "o", alternatives: ["0", "O"], context: "v0ltage", reason: "word context" }],
    });
    expect(result.confidence).toBe(1);
    expect(result.correctedText).toBe("The voltage is 5V");
    expect(result.uncertainCharacters[0].alternatives).toEqual(["0", "O"]);
    expect(result.requiresReview).toBe(true);
  });

  it("falls back to the literal transcript and marks missing confidence for review", () => {
    expect(normalizeHandwritingRecognition({ transcript: "x", confidence: "high" })).toMatchObject({
      correctedText: "x",
      confidence: null,
      requiresReview: true,
    });
  });

  it("does not turn a non-finite confidence into a trusted score", () => {
    expect(normalizeHandwritingRecognition({ transcript: "x", correctedText: "x", confidence: Number.NaN }).confidence).toBeNull();
  });

  it("normalizes structured math OCR without silently trusting uncertain symbols", () => {
    const result = normalizeHandwritingRecognition({
      transcript: "x = 1O",
      correctedText: "x = 1O",
      confidence: 0.96,
      uncertainCharacters: [],
      mathExpressions: [
        { sourceText: "x = 1O", latex: "x = 10", confidence: 0.72, uncertainTokens: ["0/O"] },
        { sourceText: "ignored", latex: "<script>alert(1)</script>", confidence: 1, uncertainTokens: [] },
      ],
    });
    expect(result.mathExpressions).toHaveLength(1);
    expect(result.mathExpressions[0]).toMatchObject({ sourceText: "x = 1O", latex: "x = 10", confidence: 0.72, uncertainTokens: ["0/O"] });
    expect(result.requiresReview).toBe(true);
  });

  it("bounds structured math expressions and confidence values", () => {
    const result = normalizeHandwritingRecognition({
      transcript: "x",
      correctedText: "x",
      confidence: 0.99,
      mathExpressions: [{ sourceText: "x²", latex: "x^2", confidence: 3, uncertainTokens: [] }],
    });
    expect(result.mathExpressions[0].confidence).toBe(1);
    expect(result.requiresReview).toBe(false);
  });
});


describe("handwriting character alternatives", () => {
  it("replaces a selected candidate inside its unique context", async () => {
    const { applyHandwritingAlternative } = await import("./handwriting");
    expect(applyHandwritingAlternative("The value is 0 in this line.", {
      seen: "0/O", chosen: "0", alternatives: ["O"], context: "value is 0 in this", reason: "shape ambiguity",
    }, "O")).toBe("The value is O in this line.");
  });

  it("replaces an unclear marker when the context contains it", async () => {
    const { applyHandwritingAlternative } = await import("./handwriting");
    expect(applyHandwritingAlternative("x = [unclear] + 2", {
      seen: "ambiguous mark", chosen: "[unclear]", alternatives: ["1", "l"], context: "x = [unclear] + 2", reason: "unclear character",
    }, "1")).toBe("x = 1 + 2");
  });

  it("refuses to guess when the target appears more than once", async () => {
    const { applyHandwritingAlternative } = await import("./handwriting");
    expect(applyHandwritingAlternative("0 + 0 = 0", {
      seen: "0/O", chosen: "0", alternatives: ["O"], context: "", reason: "ambiguous",
    }, "O")).toBeNull();
  });
  it("only applies an alternative explicitly returned by OCR", async () => {
    const { applyHandwritingAlternative } = await import("./handwriting");
    expect(applyHandwritingAlternative("value = 0", {
      seen: "0/O", chosen: "0", alternatives: ["O"], context: "value = 0", reason: "ambiguous glyph",
    }, "8")).toBeNull();
  });

  it("removes control characters and duplicate or oversized OCR alternatives", () => {
    const result = normalizeHandwritingRecognition({
      transcript: "x",
      uncertainCharacters: [{ seen: "0\n/O", chosen: "0", alternatives: ["O", "O", " ", "X".repeat(25), "I"], context: "x = 0\n", reason: "ambiguous\u0001" }],
    });
    expect(result.uncertainCharacters[0]).toMatchObject({ seen: "0/O", chosen: "0", alternatives: ["O", "I"], context: "x = 0", reason: "ambiguous" });
  });
});


describe("handwriting image payload validation", () => {
  it("accepts a PNG with a matching file signature", async () => {
    const { validateHandwritingImageData } = await import("./handwriting");
    expect(validateHandwritingImageData("iVBORw0KGgo=", "image/png")).toEqual({ valid: true });
  });

  it("accepts a JPEG with a matching file signature", async () => {
    const { validateHandwritingImageData } = await import("./handwriting");
    expect(validateHandwritingImageData("/9j/AAECAwQ=", "image/jpeg")).toEqual({ valid: true });
  });

  it("rejects invalid base64, oversized data and mismatched MIME signatures", async () => {
    const { validateHandwritingImageData } = await import("./handwriting");
    expect(validateHandwritingImageData("not-base64!", "image/png").valid).toBe(false);
    expect(validateHandwritingImageData("iVBORw0KGgo=", "image/jpeg").valid).toBe(false);
    expect(validateHandwritingImageData("A".repeat(4_194_304), "image/png").valid).toBe(false);
    expect(validateHandwritingImageData("AAAA", "image/png").valid).toBe(false);
  });
});


describe("handwriting OCR retry selection", () => {
  it("prefers a clearer untouched-image result when its adjusted score is higher", () => {
    expect(shouldUseHandwritingRetry(
      { text: "voltage", confidence: 0.78, uncertainCount: 2 },
      { text: "voltage", confidence: 0.91, uncertainCount: 0 },
    )).toBe(true);
  });

  it("does not replace a better first result with a lower-confidence retry", () => {
    expect(shouldUseHandwritingRetry(
      { text: "x = 10", confidence: 0.96, uncertainCount: 0 },
      { text: "x = 1O", confidence: 0.92, uncertainCount: 1 },
    )).toBe(false);
  });

  it("uses a retry when the first pass has no usable transcription", () => {
    expect(shouldUseHandwritingRetry(
      { text: "", confidence: 1, uncertainCount: 0 },
      { text: "E = mc²", confidence: 0.5, uncertainCount: 3 },
    )).toBe(true);
  });

  it("rejects empty retry text and treats invalid confidence as zero", () => {
    expect(shouldUseHandwritingRetry(
      { text: "original", confidence: 0.2, uncertainCount: 0 },
      { text: "  ", confidence: 1, uncertainCount: 0 },
    )).toBe(false);
    expect(shouldUseHandwritingRetry(
      { text: "original", confidence: Number.NaN, uncertainCount: 0 },
      { text: "retry", confidence: null, uncertainCount: 0 },
    )).toBe(false);
  });
});


describe("inline handwriting uncertainty highlighting", () => {
  it("locates a uniquely contextualised uncertain character", () => {
    const ranges = findHandwritingReviewRanges("The value is 10 m/s.", [{ seen: "lO", chosen: "10", alternatives: ["10", "1O"], context: "value is 10 m/s", reason: "O or zero" }]);
    expect(ranges).toEqual([{ start: 13, end: 15, seen: "lO", chosen: "10" }]);
  });

  it("does not highlight repeated ambiguous candidates without unique context", () => {
    const ranges = findHandwritingReviewRanges("x + x = 2", [{ seen: "?", chosen: "x", alternatives: ["x", "y"], context: "", reason: "unclear variable" }]);
    expect(ranges).toEqual([]);
  });

  it("keeps overlapping uncertainty ranges from producing duplicate highlights", () => {
    const ranges = findHandwritingReviewRanges("A1B", [
      { seen: "l", chosen: "1", alternatives: ["1"], context: "A1B", reason: "digit or letter" },
      { seen: "I", chosen: "1", alternatives: ["I"], context: "A1B", reason: "same location" },
    ]);
    expect(ranges).toHaveLength(1);
  });
});

describe("handwriting correction notation safeguards", () => {
  it("flags changed numbers, equations, units, formulae and scientific symbols", () => {
    expect(findHandwritingNotationWarnings("x = 10 cm, H2O, ΔT", "x = 1O mm, H₂O, DT")).toEqual([
      "numbers", "equations", "units", "chemical formulae", "scientific symbols",
    ]);
  });

  it("flags reordered numeric and scientific tokens even when the same tokens remain", () => {
    expect(findHandwritingNotationWarnings("Read values 2 and 5", "Read values 5 and 2")).toContain("numbers");
    expect(findHandwritingNotationWarnings("x + y = 3", "y + x = 3")).toContain("equations");
  });
  it("does not flag ordinary spelling and punctuation improvements", () => {
    expect(findHandwritingNotationWarnings("The voltgae is here", "The voltage is here.")).toEqual([]);
  });

  it("flags arithmetic operator substitutions inside expressions", () => {
    expect(findHandwritingNotationWarnings("x + 2 = 5", "x − 2 = 5")).toContain("scientific symbols");
    expect(findHandwritingNotationWarnings("a × b", "a + b")).toContain("scientific symbols");
  });

  it("flags superscript and subscript loss while leaving prose hyphens alone", () => {
    expect(findHandwritingNotationWarnings("x² + H₂O", "x2 + H2O")).toContain("scientific symbols");
    expect(findHandwritingNotationWarnings("well-written notes", "well written notes")).toEqual([]);
  });
  it("requires review when corrected OCR changes protected notation even at high confidence", () => {
    const result = normalizeHandwritingRecognition({
      transcript: "The value is 0.5 V",
      correctedText: "The value is 0.6 V",
      confidence: 0.99,
      uncertainCharacters: [],
    });
    expect(result.notationWarnings).toContain("numbers");
    expect(result.requiresReview).toBe(true);
  });
});
