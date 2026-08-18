import { describe, expect, it } from "vitest";
import { buildLearnerProfile } from "./profile";
import type { LearningEvidence } from "./evidence";

const evidence = (id: string, percentage: number, createdAt: string, topic = "Vectors"): LearningEvidence => ({
  id,
  workId: id,
  source: "assessment",
  subject: "Mathematics",
  topic,
  outcome: percentage >= 85 ? "mastered" : percentage < 50 ? "struggled" : "marked",
  percentage,
  weakAreas: [],
  strongAreas: [],
  createdAt,
});

describe("learner profile", () => {
  it("aggregates arbitrary subjects and recent performance", () => {
    const profile = buildLearnerProfile([
      evidence("1", 40, "2026-08-10T08:00:00Z"),
      evidence("2", 60, "2026-08-11T08:00:00Z"),
      evidence("3", 90, "2026-08-12T08:00:00Z"),
    ]);
    expect(profile.subjects).toEqual(["Mathematics"]);
    expect(profile.recentAverage).toBe(63.3);
    expect(profile.topicMastery[0].trend).toBe("unknown");
    expect(profile.topicMastery[0].mastery).toBe("secure");
  });

  it("detects improvement from an older baseline", () => {
    const values = [20, 25, 30, 70, 80, 90].map((score, index) =>
      evidence(String(index), score, `2026-08-${String(1 + index).padStart(2, "0")}T08:00:00Z`)
    );
    const topic = buildLearnerProfile(values).topicMastery[0];
    expect(topic.trend).toBe("improving");
    expect(topic.weak).toBe(false);
    expect(topic.strong).toBe(true);
  });

  it("keeps different subjects with the same topic separate", () => {
    const profile = buildLearnerProfile([
      evidence("math", 40, "2026-08-10T08:00:00Z", "Mechanics"),
      { ...evidence("physics", 90, "2026-08-11T08:00:00Z", "Mechanics"), subject: "Physics" },
    ]);
    expect(profile.topicMastery).toHaveLength(2);
    expect(profile.weakAreas).toEqual(["Mechanics"]);
    expect(profile.strongAreas).toEqual(["Mechanics"]);
  });
});
