import { describe, expect, it } from "vitest";
import { normalizeLearningContext, normalizeLearningContextLabel } from "./learningContextKey";

describe("learning context keys", () => {
  it("normalizes equivalent labels for cross-surface evidence grouping", () => {
    expect(normalizeLearningContext("Physics", "Wave Motion")).toEqual({
      subjectId: "physics",
      topicId: "wave motion",
    });
    expect(normalizeLearningContext(" PHYSICS ", "wave-motion")).toEqual({
      subjectId: "physics",
      topicId: "wave motion",
    });
  });

  it("preserves letters from non-Latin writing systems", () => {
    expect(normalizeLearningContextLabel("数学・微积分")).toBe("数学 微积分");
  });

  it("omits missing labels rather than creating empty evidence keys", () => {
    expect(normalizeLearningContext("", "   ")).toEqual({});
  });

  it("bounds key length", () => {
    expect(normalizeLearningContextLabel("x".repeat(500))).toHaveLength(180);
  });
});
