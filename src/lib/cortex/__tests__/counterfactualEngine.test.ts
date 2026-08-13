import { describe, expect, it } from "vitest";
import { evaluateCounterfactuals } from "../counterfactualEngine";

const candidate = (id: string, mastery: number, examUrgency: number) => ({
  id,
  type: "revision" as const,
  mastery,
  retentionRisk: 50,
  examUrgency,
  prerequisiteValue: 50,
  goalAlignment: 50,
  curriculumGap: 50,
  trendRisk: 50,
  uncertainty: 50,
  momentum: 50,
  estimatedMinutes: 15,
});

describe("Counterfactual Cortex", () => {
  it("keeps all alternatives and ranks them", () => {
    const result = evaluateCounterfactuals([
      candidate("weak", 20, 80),
      candidate("medium", 50, 50),
      candidate("strong", 90, 20),
    ]);
    expect(result.chosen?.candidate.id).toBe("weak");
    expect(result.alternatives).toHaveLength(3);
    expect(result.alternatives.map((item) => item.rank)).toEqual([1, 2, 3]);
  });

  it("exposes a non-negative decision margin", () => {
    const result = evaluateCounterfactuals([candidate("a", 20, 80), candidate("b", 20, 79)]);
    expect(result.margin).toBeGreaterThanOrEqual(0);
  });

  it("handles an empty candidate set", () => {
    expect(evaluateCounterfactuals([])).toEqual({ chosen: null, alternatives: [], margin: 0 });
  });
});
