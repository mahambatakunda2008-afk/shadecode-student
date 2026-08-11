import { describe, expect, it } from "vitest";
import { runCalibrationBenchmark } from "../calibrationBenchmark";
import type { CalibrationWeights } from "../calibrationEngine";

const weights: CalibrationWeights = {
  masteryGap: 1, retentionRisk: 1, examUrgency: 1, prerequisiteValue: 1,
  goalAlignment: 1, curriculumGap: 1, trendRisk: 1, uncertainty: 1, momentum: 1,
};

const candidate = (id: string, mastery: number, examUrgency: number) => ({
  id,
  type: "revision" as const,
  mastery,
  retentionRisk: 100 - mastery,
  examUrgency,
  prerequisiteValue: 50,
  goalAlignment: 50,
  curriculumGap: 100 - mastery,
  trendRisk: 50,
  uncertainty: 50,
  momentum: 50,
  estimatedMinutes: 15,
});

describe("Calibration benchmark", () => {
  it("scores calibration on unseen examples", () => {
    const examples = [
      { candidates: [candidate("weak-1", 20, 20), candidate("strong-1", 90, 20)], preferredCandidateId: "weak-1" },
      { candidates: [candidate("weak-2", 25, 30), candidate("strong-2", 85, 30)], preferredCandidateId: "weak-2" },
      { candidates: [candidate("weak-3", 30, 40), candidate("strong-3", 80, 40)], preferredCandidateId: "weak-3" },
      { candidates: [candidate("weak-4", 35, 50), candidate("strong-4", 75, 50)], preferredCandidateId: "weak-4" },
      { candidates: [candidate("weak-5", 40, 60), candidate("strong-5", 70, 60)], preferredCandidateId: "weak-5" },
      { candidates: [candidate("weak-6", 45, 70), candidate("strong-6", 65, 70)], preferredCandidateId: "weak-6" },
    ];

    const result = runCalibrationBenchmark(weights, examples, 0.33, 0.1);
    expect(result.trainCount).toBe(4);
    expect(result.holdoutCount).toBe(2);
    expect(result.baseline.total).toBe(2);
    expect(result.calibrated.total).toBe(2);
  });

  it("rejects a benchmark that is too small to hold out safely", () => {
    expect(() => runCalibrationBenchmark(weights, [])).toThrow(/at least 4 examples/i);
  });
});
