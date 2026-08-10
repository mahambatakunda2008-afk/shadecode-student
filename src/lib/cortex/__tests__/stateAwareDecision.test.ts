import { describe, expect, it } from "vitest";
import { chooseStateAwareLearningMove } from "../stateAwareDecision";
import { createInitialLearningState } from "../learningState";

describe("state-aware Cortex decision", () => {
  it("selects the stronger topic from learning state", () => {
    const weak = {
      id: "algebra",
      type: "revision" as const,
      state: {
        ...createInitialLearningState("algebra"),
        mastery: 25,
        retention: 20,
        uncertainty: 40,
        recentImprovement: -15,
      },
      estimatedMinutes: 20,
    };
    const strong = {
      id: "sets",
      type: "revision" as const,
      state: {
        ...createInitialLearningState("sets"),
        mastery: 85,
        retention: 90,
        uncertainty: 20,
        recentImprovement: 10,
      },
      estimatedMinutes: 20,
    };

    const result = chooseStateAwareLearningMove([weak, strong]);
    expect(result.source).toBe("learning-state");
    expect(result.decision?.candidate.id).toBe("algebra");
  });

  it("returns an explicit empty state", () => {
    const result = chooseStateAwareLearningMove([]);
    expect(result.decision).toBeNull();
    expect(result.source).toBe("no-candidates");
    expect(result.candidates).toEqual([]);
  });
});
