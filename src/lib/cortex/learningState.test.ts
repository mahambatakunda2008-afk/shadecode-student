import { describe, expect, it } from "vitest";
import { createInitialLearningState, reduceLearningObservation } from "./learningState";
import { learningStateToCandidate } from "./stateToUtility";

describe("Cortex learning-state foundation", () => {
  it("does not treat the neutral initial mastery placeholder as observed evidence", () => {
    const state = createInitialLearningState("math.chain-rule");
    const candidate = learningStateToCandidate({
      id: "math.chain-rule",
      type: "practice",
      state,
    });

    expect(state.exposure).toBe(0);
    expect(candidate.mastery).toBe(50);
    expect(candidate.uncertainty).toBe(100);
  });

  it("uses the first real observation as the baseline", () => {
    const initial = createInitialLearningState("math.chain-rule");
    const next = reduceLearningObservation(initial, {
      topicId: "math.chain-rule",
      correct: false,
      observedAt: "2026-10-23T18:00:00.000Z",
    });

    expect(next.mastery).toBe(0);
    expect(next.exposure).toBe(1);
    expect(next.lastObservedAt).toBe("2026-10-23T18:00:00.000Z");
  });

  it("updates subsequent observations through the shared mastery transition", () => {
    const initial = createInitialLearningState("math.chain-rule");
    const first = reduceLearningObservation(initial, {
      topicId: "math.chain-rule",
      correct: false,
    });
    const second = reduceLearningObservation(first, {
      topicId: "math.chain-rule",
      correct: true,
    });

    expect(second.mastery).toBe(30);
    expect(second.exposure).toBe(2);
  });

  it("rejects evidence for a different topic instead of corrupting state", () => {
    expect(() =>
      reduceLearningObservation(createInitialLearningState("math.chain-rule"), {
        topicId: "physics.waves",
        correct: true,
      }),
    ).toThrow("Learning observation topic does not match state topic");
  });
});
