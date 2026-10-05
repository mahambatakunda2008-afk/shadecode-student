import { describe, expect, it } from "vitest";
import { canonicalLabel } from "./canonical";
import { projectPaperSignal } from "./paperSignal";

const NOW = "2026-10-05T10:00:00.000Z";

describe("projectPaperSignal", () => {
  it("writes first-attempt mastery on the 0-100 scale", () => {
    const { row, revisionPriority } = projectPaperSignal(null, "partially_correct", NOW);
    expect(row.mastery_score).toBe(55);
    expect(row.last_score).toBe(55);
    expect(row.attempts).toBe(1);
    expect(row.trend).toBe(0);
    expect(revisionPriority).toBe(6);
  });

  it("blends with the shared EMA and reports a numeric trend", () => {
    const { row } = projectPaperSignal({ mastery_score: 80, attempts: 4, exposure: 4 }, "incorrect", NOW);
    expect(row.mastery_score).toBe(56);
    expect(row.trend).toBe(-24);
    expect(row.attempts).toBe(5);
    expect(row.exposure).toBe(5);
    expect(row.recent_improvement).toBeCloseTo(-0.24);
  });

  it("keeps probability-style fields in 0-1", () => {
    const { row } = projectPaperSignal({ mastery_score: 10, confidence: 0.9, error_rate: 0.1 }, "correct", NOW);
    for (const key of ["confidence", "error_rate", "uncertainty", "retention", "stability"] as const) {
      expect(row[key]).toBeGreaterThanOrEqual(0);
      expect(row[key]).toBeLessThanOrEqual(1);
    }
    expect(row.mastery_score).toBe(37);
  });

  it("does not flag a strong correct answer for revision", () => {
    expect(projectPaperSignal({ mastery_score: 90, attempts: 3 }, "correct", NOW).revisionPriority).toBe(1);
  });
});

describe("canonicalLabel", () => {
  it("collapses whitespace and trailing punctuation", () => {
    expect(canonicalLabel("  Quadratic   equations. ")).toBe("Quadratic equations");
  });
  it("handles empty input", () => {
    expect(canonicalLabel(null)).toBe("");
  });
});
