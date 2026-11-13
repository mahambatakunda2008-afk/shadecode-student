import { describe, expect, it } from "vitest";
import { deriveLearnerTopicState } from "./learnerTopicState";

describe("deriveLearnerTopicState", () => {
  it("keeps topics with no scored attempts unobserved", () => {
    expect(deriveLearnerTopicState({
      attempts: 0, masteryScore: null, errorRate: null, recentImprovement: null, uncertainty: null,
    })).toMatchObject({ mastery: "unobserved", trajectory: "unknown", evidenceStrength: "none", confidence: null });
  });

  it("requires repeated strong evidence before calling mastery demonstrated", () => {
    expect(deriveLearnerTopicState({
      attempts: 2, masteryScore: 95, errorRate: 0, recentImprovement: 5, uncertainty: 10,
    }).mastery).toBe("developing");
    expect(deriveLearnerTopicState({
      attempts: 3, masteryScore: 85, errorRate: 10, recentImprovement: 5, uncertainty: 10,
    })).toMatchObject({ mastery: "demonstrated", trajectory: "improving", evidenceStrength: "moderate", confidence: 90 });
  });

  it("requires repeated low evidence before labelling struggle", () => {
    expect(deriveLearnerTopicState({
      attempts: 1, masteryScore: 10, errorRate: 90, recentImprovement: null, uncertainty: 80,
    }).mastery).toBe("developing");
    expect(deriveLearnerTopicState({
      attempts: 2, masteryScore: 40, errorRate: 70, recentImprovement: -4, uncertainty: 60,
    })).toMatchObject({ mastery: "struggling", trajectory: "declining" });
  });

  it("does not invent a trajectory without repeated observations", () => {
    expect(deriveLearnerTopicState({
      attempts: 1, masteryScore: 80, errorRate: 10, recentImprovement: 20, uncertainty: 30,
    }).trajectory).toBe("unknown");
  });
});
