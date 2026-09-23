import { describe, expect, it } from "vitest";
import {
  calculateCortexProgress,
  classifyCortexFailure,
  isTerminalFailure,
  mergePartial,
  recoveryForFailure,
  shouldRetry,
} from "./faultTolerance";

describe("Cortex fault tolerance", () => {
  it("classifies transient provider failures as retryable", () => {
    expect(classifyCortexFailure(new Error("provider timeout"))).toBe("transient");
    expect(recoveryForFailure("transient")).toBe("retry_with_backoff");
  });

  it("treats permanent boundary failures as terminal", () => {
    expect(classifyCortexFailure(new Error("Unauthorized"), 401)).toBe("auth");
    expect(isTerminalFailure("auth")).toBe(true);
    expect(isTerminalFailure("transient")).toBe(false);
  });

  it("never advances progress for work that is not complete", () => {
    expect(calculateCortexProgress({
      completedUnits: 3,
      totalUnits: 8,
      stageIndex: 1,
      totalStages: 4,
    })).toBe(34);
  });

  it("caps retries at the configured limit", () => {
    expect(shouldRetry(0, 3)).toBe(true);
    expect(shouldRetry(2, 3)).toBe(true);
    expect(shouldRetry(3, 3)).toBe(false);
  });

  it("merges partial work without duplicating logical units", () => {
    const result = mergePartial(
      [{ id: "1", value: "old" }, { id: "2", value: "keep" }],
      [{ id: "1", value: "repaired" }, { id: "3", value: "new" }],
      item => item.id,
    );
    expect(result).toEqual([
      { id: "1", value: "repaired" },
      { id: "2", value: "keep" },
      { id: "3", value: "new" },
    ]);
  });
});
