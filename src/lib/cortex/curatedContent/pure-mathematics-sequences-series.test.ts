import { describe, expect, it } from "vitest";
import { PURE_MATHEMATICS_SEQUENCES_SERIES_STARTER } from "./pure-mathematics-sequences-series";

describe("Pure Mathematics sequences and series starter", () => {
  it("contains the core teaching blocks and learner-drawn sequence prompt", () => {
    const blocks = PURE_MATHEMATICS_SEQUENCES_SERIES_STARTER.blocks;
    const types = new Set(blocks.map((block) => block.type));
    for (const type of ["objective", "prior", "definition", "example", "formula", "concept", "diagram", "checkpoint", "misconception", "practice", "exam", "summary"]) {
      expect(types.has(type), `missing ${type}`).toBe(true);
    }
    expect(blocks.length).toBeGreaterThanOrEqual(16);
    expect(blocks.at(-1)?.type).toBe("summary");
    expect(blocks.find((block) => block.type === "diagram")?.content).toContain("y = 16");
    for (const block of blocks) {
      expect(block.content.trim().length, block.title).toBeGreaterThanOrEqual(40);
      expect(block.content.length, block.title).toBeLessThanOrEqual(1800);
    }
  });

  it("checks arithmetic and geometric example answers", () => {
    expect(7 + (12 - 1) * 4).toBe(51);
    expect((12 * (7 + 51)) / 2).toBe(348);
    expect(3 * 2 ** (6 - 1)).toBe(96);
    expect((3 * (1 - 2 ** 6)) / (1 - 2)).toBe(189);

    expect(2 + (20 - 1) * 3).toBe(59);
    expect(2 + (10 - 1) * 3).toBe(29);
    expect((10 * (2 + 29)) / 2).toBe(155);
    expect(4 * 3 ** 6).toBe(2916);
    expect(8 / (1 - 0.5)).toBe(16);
    expect(6 / (1 - 0.5)).toBe(12);
  });

  it("checks convergence numerically and handles the finite-sum r = 1 case", () => {
    const partialSum = (a: number, r: number, n: number) =>
      Array.from({ length: n }, (_, index) => a * r ** index).reduce((sum, term) => sum + term, 0);

    // For |r| < 1, partial sums approach a / (1 - r).
    expect(partialSum(8, 0.5, 20)).toBeCloseTo(16, 5);
    expect(partialSum(8, -0.5, 20)).toBeCloseTo(8 / 1.5, 5);

    // A ratio of 1 is valid for a finite series but not for the quotient formula.
    expect(partialSum(3, 1, 5)).toBe(15);
    expect(3 * 5).toBe(15);

    // With |r| >= 1 and non-zero first term, terms do not tend to zero.
    expect(Math.abs(2 * 2 ** 20)).toBeGreaterThan(1);
    expect(Math.abs(4 * (-1) ** 20)).toBe(4);
  });

  it("guards the convergence condition for infinite geometric series", () => {
    expect(Math.abs(0.5)).toBeLessThan(1);
    expect(Math.abs(-0.5)).toBeLessThan(1);
    expect(Math.abs(2)).toBeGreaterThanOrEqual(1);
    expect(Math.abs(-1)).toBeGreaterThanOrEqual(1);
    expect(PURE_MATHEMATICS_SEQUENCES_SERIES_STARTER.blocks.map((block) => block.content).join("\n")).toContain("|r| < 1");
  });
});
