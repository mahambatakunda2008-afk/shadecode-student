import { describe, expect, it } from "vitest";
import { recommendFromProfile } from "./profile-adaptive";
import type { LearnerProfile } from "./profile";

const profile: LearnerProfile = {
  evidenceCount: 6,
  subjects: ["Mathematics", "Physics"],
  weakAreas: ["Integration"],
  strongAreas: ["Mechanics"],
  recentAverage: 68,
  generatedAt: "2026-08-18T10:00:00Z",
  topicMastery: [
    { key: "mathematics::integration", subject: "Mathematics", topic: "Integration", attempts: 3, averagePercentage: 42, trend: "declining", mastery: "developing", weak: true, strong: false },
    { key: "physics::mechanics", subject: "Physics", topic: "Mechanics", attempts: 3, averagePercentage: 91, trend: "stable", mastery: "secure", weak: false, strong: true },
  ],
};

describe("profile adaptive recommendations", () => {
  it("prioritizes a weak topic in the requested subject", () => {
    const recommendation = recommendFromProfile(profile, "Mathematics");
    expect(recommendation.action).toBe("lesson");
    expect(recommendation.topic).toBe("Integration");
    expect(recommendation.priority).toBe("high");
  });

  it("does not cross subject boundaries", () => {
    const recommendation = recommendFromProfile(profile, "Chemistry");
    expect(recommendation.topic).toBeUndefined();
    expect(recommendation.subject).toBe("Chemistry");
  });

  it("uses challenge mode for strong exam-context performance", () => {
    const recommendation = recommendFromProfile(profile, "Physics", "exam");
    expect(recommendation.action).toBe("challenge");
    expect(recommendation.topic).toBe("Mechanics");
  });
});
