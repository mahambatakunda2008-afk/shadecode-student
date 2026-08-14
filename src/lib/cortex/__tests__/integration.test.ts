import { describe, expect, it } from "vitest";
import { buildCortexTopicContext } from "../integration";

describe("Cortex integration", () => {
  it("combines replayed state with the ranked decision surface", () => {
    const result = buildCortexTopicContext(
      "algebra",
      [{
        id: "algebra",
        type: "revision",
        mastery: 25,
        retentionRisk: 85,
        examUrgency: 80,
        prerequisiteValue: 70,
        goalAlignment: 80,
        curriculumGap: 80,
        trendRisk: 70,
        uncertainty: 75,
        momentum: 20,
        estimatedMinutes: 15,
      }],
      [{ type: "question_answered", topicId: "algebra", correct: false, difficulty: 70 }],
    );

    expect(result.state.exposure).toBe(1);
    expect(result.decision?.candidate.id).toBe("algebra");
    expect(result.counterfactuals.alternatives).toHaveLength(1);
  });

  it("handles no candidates without throwing", () => {
    const result = buildCortexTopicContext("algebra", []);
    expect(result.decision).toBeNull();
    expect(result.counterfactuals.alternatives).toEqual([]);
  });
});
