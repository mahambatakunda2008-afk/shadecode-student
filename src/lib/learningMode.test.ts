import { describe, expect, it } from "vitest";
import { DEFAULT_LEARNING_MODE, normalizeLearningMode } from "@/lib/learningMode";

describe("learning mode", () => {
  it("defaults to Classic so AI is opt-in", () => {
    expect(DEFAULT_LEARNING_MODE).toBe("classic");
  });

  it("accepts only the explicit AI mode", () => {
    expect(normalizeLearningMode("ai")).toBe("ai");
    expect(normalizeLearningMode("classic")).toBe("classic");
    expect(normalizeLearningMode(null)).toBe("classic");
    expect(normalizeLearningMode("unexpected")).toBe("classic");
  });
});
