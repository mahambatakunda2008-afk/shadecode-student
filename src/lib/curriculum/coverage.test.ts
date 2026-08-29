import { describe, expect, it } from "vitest";
import { analyzeCurriculumCoverage, getRecommendedStudyOrder } from "./coverage";
import type { StudentProgress } from "./types";

const baseProgress: StudentProgress = {
  userId: "user-1",
  subject: "Mathematics",
  board: "Cambridge",
  level: "IGCSE",
  completedTopics: ["cambridge-math-1"],
  topicProgress: {
    "cambridge-math-1": { topicId: "cambridge-math-1", completed: true, score: 85, timeSpent: 60, lastAttempted: "2026-08-29T10:00:00Z", attempts: 3 },
    "cambridge-math-2": { topicId: "cambridge-math-2", completed: false, score: 45, timeSpent: 20, lastAttempted: "2026-08-28T10:00:00Z", attempts: 1 },
  },
  lastUpdated: "2026-08-29T10:00:00Z",
};

describe("curriculum coverage", () => {
  it("counts only topics in the active curriculum catalog", () => {
    const coverage = analyzeCurriculumCoverage(baseProgress);
    expect(coverage.totalTopics).toBe(8);
    expect(coverage.completedTopics).toBe(1);
    expect(coverage.coveragePercentage).toBe(12.5);
    expect(coverage.weakTopics).toEqual(["cambridge-math-2"]);
  });

  it("does not let prerequisite ordering violate completed curriculum state", () => {
    const order = getRecommendedStudyOrder(baseProgress);
    expect(order.indexOf("cambridge-math-1")).toBeLessThan(order.indexOf("cambridge-math-2"));
  });
});