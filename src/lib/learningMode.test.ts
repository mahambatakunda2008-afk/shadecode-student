import { describe, expect, it } from "vitest";
import { DEFAULT_LEARNING_MODE, normalizeLearningMode } from "@/lib/learningMode";

describe("learning mode", () => {
  it("defaults to Cortex AI when no preference has been saved", () => {
    expect(DEFAULT_LEARNING_MODE).toBe("ai");
    expect(normalizeLearningMode(null)).toBe("ai");
    expect(normalizeLearningMode(undefined)).toBe("ai");
  });

  it("preserves an explicit Classic preference", () => {
    expect(normalizeLearningMode("classic")).toBe("classic");
  });

  it("accepts an explicit AI preference", () => {
    expect(normalizeLearningMode("ai")).toBe("ai");
  });

  it("uses the default for invalid stored values", () => {
    expect(normalizeLearningMode("unexpected")).toBe("ai");
  });
});
