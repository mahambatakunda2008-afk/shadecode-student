import { describe, expect, it } from "vitest";
import { evaluateExperiment } from "./scoring";

const thresholds = {
  learningOutcome: 0.7,
  correctness: 0.9,
  retention: 0.6,
  accessibility: 0.7,
  costEfficiency: 0.5,
  engagement: 0.5,
};

describe("evaluateExperiment", () => {
  it("promotes a strong experiment that passes every gate", () => {
    const result = evaluateExperiment(
      {
        learningOutcome: 0.92,
        correctness: 0.98,
        retention: 0.88,
        accessibility: 0.9,
        costEfficiency: 0.8,
        engagement: 0.86,
      },
      thresholds,
    );

    expect(result.decision).toBe("promote");
    expect(result.failedGates).toEqual([]);
    expect(result.score).toBeGreaterThan(0.8);
  });

  it("rejects an experiment when learning outcome misses its hard gate", () => {
    const result = evaluateExperiment(
      {
        learningOutcome: 0.69,
        correctness: 0.99,
        retention: 0.95,
        accessibility: 0.95,
        costEfficiency: 0.95,
        engagement: 0.95,
      },
      thresholds,
    );

    expect(result.decision).toBe("reject");
    expect(result.failedGates).toContain("learningOutcome");
  });

  it("rejects invalid metric values instead of silently clamping them", () => {
    const result = evaluateExperiment(
      {
        learningOutcome: Number.NaN,
        correctness: 0.95,
        retention: 0.8,
        accessibility: 0.8,
        costEfficiency: 0.8,
        engagement: 0.8,
      },
      thresholds,
    );

    expect(result.decision).toBe("reject");
    expect(result.failedGates).toContain("metric:learningOutcome");
  });

  it("rejects invalid thresholds instead of silently normalizing them", () => {
    const result = evaluateExperiment(
      {
        learningOutcome: 0.99,
        correctness: 0.99,
        retention: 0.99,
        accessibility: 0.99,
        costEfficiency: 0.99,
        engagement: 0.99,
      },
      { ...thresholds, correctness: Number.POSITIVE_INFINITY },
    );

    expect(result.decision).toBe("reject");
    expect(result.failedGates).toContain("threshold:correctness");
  });

  it("iterates when hard gates pass but supporting evidence is incomplete", () => {
    const result = evaluateExperiment(
      {
        learningOutcome: 0.75,
        correctness: 0.92,
        retention: 0.4,
        accessibility: 0.7,
        costEfficiency: 0.5,
        engagement: 0.5,
      },
      thresholds,
    );

    expect(result.decision).toBe("iterate");
    expect(result.failedGates).toContain("retention");
  });
});
