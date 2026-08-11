import { describe, expect, it } from "vitest";
import { calibrateWeights, evaluateWeights, type CalibrationWeights } from "../calibrationEngine";

const weights: CalibrationWeights = {
  masteryGap: 1, retentionRisk: 1, examUrgency: 1, prerequisiteValue: 1,
  goalAlignment: 1, curriculumGap: 1, trendRisk: 1, uncertainty: 1, momentum: 1,
};

const weak = {
  id: "weak", type: "revision" as const, mastery: 20, retentionRisk: 90, examUrgency: 80,
  prerequisiteValue: 80, goalAlignment: 80, curriculumGap: 80, trendRisk: 70,
  uncertainty: 70, momentum: 20, estimatedMinutes: 15,
};
const strong = {
  id: "strong", type: "revision" as const, mastery: 90, retentionRisk: 10, examUrgency: 20,
  prerequisiteValue: 20, goalAlignment: 20, curriculumGap: 10, trendRisk: 10,
  uncertainty: 20, momentum: 80, estimatedMinutes: 15,
};

describe("Cortex calibration", () => {
  it("scores reviewed examples", () => {
    const result = evaluateWeights(weights, [{ candidates: [weak, strong], preferredCandidateId: "weak" }]);
    expect(result.total).toBe(1);
    expect(result.correct).toBe(1);
    expect(result.score).toBe(1);
  });

  it("keeps weights bounded and deterministic", () => {
    const examples = [{ candidates: [weak, strong], preferredCandidateId: "weak" }];
    const first = calibrateWeights(weights, examples, 0.1);
    const second = calibrateWeights(weights, examples, 0.1);
    expect(first).toEqual(second);
    for (const value of Object.values(first.weights)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(2);
    }
  });
});
