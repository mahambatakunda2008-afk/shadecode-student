import { describe, expect, it } from "vitest";
import { CORTEX_BENCHMARK_V1, CORTEX_BENCHMARK_VERSION } from "../benchmarkV1";
import { evaluateWeights, type CalibrationWeights } from "../calibrationEngine";

const weights: CalibrationWeights = {
  masteryGap: 1, retentionRisk: 1, examUrgency: 1, prerequisiteValue: 1,
  goalAlignment: 1, curriculumGap: 1, trendRisk: 1, uncertainty: 1, momentum: 1,
};

describe("Cortex benchmark v1", () => {
  it("has a stable version and broad scenario coverage", () => {
    expect(CORTEX_BENCHMARK_VERSION).toBe("v1.0.0");
    expect(CORTEX_BENCHMARK_V1.length).toBeGreaterThanOrEqual(10);
    expect(new Set(CORTEX_BENCHMARK_V1.map((item) => item.category)).size).toBeGreaterThanOrEqual(10);
  });

  it("has unique IDs and valid preferred candidates", () => {
    const ids = CORTEX_BENCHMARK_V1.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of CORTEX_BENCHMARK_V1) {
      expect(item.candidates.some((candidate) => candidate.id === item.preferredCandidateId)).toBe(true);
      expect(item.rationale.length).toBeGreaterThan(20);
    }
  });

  it("gives the baseline at least a non-zero benchmark signal", () => {
    const result = evaluateWeights(weights, CORTEX_BENCHMARK_V1);
    expect(result.total).toBe(CORTEX_BENCHMARK_V1.length);
    expect(result.correct).toBeGreaterThan(0);
  });
});
