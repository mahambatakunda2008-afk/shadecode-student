import { describe, expect, it } from "vitest";
import { CORTEX_EVALUATION_FIXTURES } from "./fixtures";
import { evaluateExperiment } from "./scoring";

describe("Cortex evaluation harness", () => {
  it("evaluates every deterministic learner fixture", () => {
    for (const fixture of CORTEX_EVALUATION_FIXTURES) {
      const baseline = evaluateExperiment(fixture.baseline, fixture.thresholds);
      const candidate = evaluateExperiment(fixture.candidate, fixture.thresholds);
      expect(Number.isFinite(baseline.score)).toBe(true);
      expect(Number.isFinite(candidate.score)).toBe(true);
      expect(candidate.score).toBeGreaterThan(baseline.score);
    }
  });

  it("rejects non-finite metrics and thresholds", () => {
    const fixture = CORTEX_EVALUATION_FIXTURES[0];
    const badMetric = evaluateExperiment({ ...fixture.candidate, learningOutcome: Number.NaN }, fixture.thresholds);
    const badThreshold = evaluateExperiment(fixture.candidate, { ...fixture.thresholds, correctness: Number.POSITIVE_INFINITY });
    expect(badMetric.decision).toBe("reject");
    expect(badMetric.failedGates).toContain("metric:learningOutcome");
    expect(badThreshold.decision).toBe("reject");
    expect(badThreshold.failedGates).toContain("threshold:correctness");
  });

  it("never promotes a result that misses learning or correctness gates", () => {
    const fixture = CORTEX_EVALUATION_FIXTURES[0];
    const result = evaluateExperiment({ ...fixture.candidate, correctness: 0.89 }, fixture.thresholds);
    expect(result.decision).toBe("reject");
  });
});
