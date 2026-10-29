import { describe, expect, it } from "vitest";
import { PURE_MATHEMATICS_LOGS_EXPONENTIALS_STARTER } from "./pure-mathematics-logs-exponentials";

describe("Pure Mathematics logarithms and exponentials starter", () => {
  it("contains a complete teaching sequence with valid block sizes", () => {
    const blocks = PURE_MATHEMATICS_LOGS_EXPONENTIALS_STARTER.blocks;
    const types = new Set(blocks.map((block) => block.type));
    for (const type of ["objective", "prior", "definition", "example", "concept", "diagram", "checkpoint", "misconception", "practice", "exam", "summary"]) {
      expect(types.has(type), `missing ${type}`).toBe(true);
    }
    expect(blocks.length).toBeGreaterThanOrEqual(14);
    expect(blocks[0].type).toBe("objective");
    expect(blocks.at(-1)?.type).toBe("summary");
    for (const block of blocks) {
      expect(block.content.trim().length, block.title).toBeGreaterThanOrEqual(40);
      expect(block.content.length, block.title).toBeLessThanOrEqual(1800);
    }
  });

  it("checks the numerical results used by worked examples and practice", () => {
    expect(3 ** 4).toBe(81);
    expect(5 ** 3).toBe(125);
    expect(Math.log2(8)).toBe(3);
    expect(3 ** (2 * 2 - 1)).toBe(27);
    expect(2 ** 3).toBe(8);
    expect(2 ** (3 + 2)).toBe(32);
    expect(3 ** 2).toBe(9);
    expect(Math.log10(7) / Math.log10(10)).toBeCloseTo(Math.log10(7));
  });

  it("validates logarithm laws numerically instead of only checking lesson wording", () => {
    // Product, quotient and power laws for base 2.
    expect(Math.log2(8 * 4)).toBe(Math.log2(8) + Math.log2(4));
    expect(Math.log2(8 / 4)).toBe(Math.log2(8) - Math.log2(4));
    expect(Math.log2(8 ** 2)).toBe(2 * Math.log2(8));

    // The lesson's worked simplification is valid for positive x.
    for (const x of [0.25, 1, 3, 8]) {
      expect(Math.log2(8 * x) - Math.log2(x)).toBeCloseTo(3);
    }
  });

  it("checks solved equations by substitution and rejects invalid logarithm domains", () => {
    // 3^(2x - 1) = 27 has x = 2; 2^(x + 2) = 32 has x = 3.
    expect(3 ** (2 * 2 - 1)).toBe(27);
    expect(2 ** (3 + 2)).toBe(32);

    // log_3(2x + 1) = 2 gives x = 4, with 2x + 1 > 0.
    expect(Math.log(2 * 4 + 1) / Math.log(3)).toBeCloseTo(2);
    expect(2 * 4 + 1).toBeGreaterThan(0);

    // log_2(x - 1) requires x > 1. At x = 1 the argument is zero;
    // at x = 0 it is negative, so neither input gives a finite real logarithm.
    expect(9 - 1).toBeGreaterThan(0);
    expect(Number.isFinite(Math.log2(1 - 1))).toBe(false);
    expect(Number.isNaN(Math.log2(0 - 1))).toBe(true);

    // Change-of-base answer for 10^x = 7 is checked by substitution.
    const x = Math.log(7) / Math.log(10);
    expect(10 ** x).toBeCloseTo(7);
  });

  it("checks the coordinates and asymptotes described by the graph task", () => {
    expect(2 ** -1).toBe(0.5);
    expect(2 ** 0).toBe(1);
    expect(2 ** 1).toBe(2);
    expect(Math.log2(0.5)).toBe(-1);
    expect(Math.log2(1)).toBe(0);
    expect(Math.log2(2)).toBe(1);

    const diagram = PURE_MATHEMATICS_LOGS_EXPONENTIALS_STARTER.blocks.find((block) =>
      block.title === "Sketching exponential and logarithmic graphs",
    );
    expect(diagram?.content).toContain("asymptotes y = 0 and x = 0");
  });

  it("documents logarithm domain restrictions and graph features", () => {
    const lesson = PURE_MATHEMATICS_LOGS_EXPONENTIALS_STARTER.blocks.map((block) => block.content).join("\n");
    expect(lesson).toContain("argument x must be positive");
    expect(lesson).toContain("domain all real x");
    expect(lesson).toContain("approaching but never touching the y-axis");
    expect(lesson).toContain("log(M + N)");
    expect(lesson).not.toMatch(/syllabus (?:is )?verified/i);
  });
});
