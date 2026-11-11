import { describe, expect, it } from "vitest";
import { normalizeHandwritingRecognition, parseHandwritingRecognition } from "./handwriting";

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
});
