import { describe, expect, it } from "vitest";
import { learningStateToCandidate, learningStatesToCandidates } from "../stateToUtility";
import { createInitialLearningState } from "../learningState";

describe("Learning State → SLU", () => {
  it("maps retention into retention risk", () => {
    const state = { ...createInitialLearningState("algebra"), retention: 20, mastery: 30 };
    const candidate = learningStateToCandidate({ id: "algebra", type: "revision", state });
    expect(candidate.retentionRisk).toBe(80);
    expect(candidate.mastery).toBe(30);
  });

  it("uses uncertainty and recent improvement as decision signals", () => {
    const state = { ...createInitialLearningState("algebra"), uncertainty: 90, recentImprovement: -20 };
    const candidate = learningStateToCandidate({ id: "algebra", type: "practice", state });
    expect(candidate.uncertainty).toBe(90);
    expect(candidate.trendRisk).toBe(70);
    expect(candidate.momentum).toBe(30);
  });

  it("supports batches of topic states", () => {
    const states = ["algebra", "mechanics"].map((topicId) => ({
      id: topicId,
      type: "revision" as const,
      state: createInitialLearningState(topicId),
    }));
    expect(learningStatesToCandidates(states)).toHaveLength(2);
  });
});
