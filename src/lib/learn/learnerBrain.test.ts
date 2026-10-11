import { describe, expect, it } from "vitest";
import { inferLearningOutcome, normalizeLearnerTopic } from "./learnerBrain";

describe("learner brain memory", () => {
  it("normalizes topic keys across case and punctuation", () => {
    expect(normalizeLearnerTopic("Physics", "Waves: Phase Difference!"))
      .toBe(normalizeLearnerTopic(" physics ", "waves phase difference"));
  });

  it("keeps subject identity in topic keys", () => {
    expect(normalizeLearnerTopic("Physics", "Waves"))
      .not.toBe(normalizeLearnerTopic("Mathematics", "Waves"));
  });

  it("classifies learning signals without claiming mastery from a request", () => {
    expect(inferLearningOutcome(0.2)).toBe("needs_support");
    expect(inferLearningOutcome(0.65)).toBe("developing");
    expect(inferLearningOutcome(0.95)).toBe("strong");
    expect(inferLearningOutcome(Number.NaN)).toBe("needs_support");
  });
});
