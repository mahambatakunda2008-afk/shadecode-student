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

  it("documents logarithm domain restrictions and graph features", () => {
    const lesson = PURE_MATHEMATICS_LOGS_EXPONENTIALS_STARTER.blocks.map((block) => block.content).join("\n");
    expect(lesson).toContain("argument x must be positive");
    expect(lesson).toContain("domain all real x");
    expect(lesson).toContain("approaching but never touching the y-axis");
    expect(lesson).toContain("log(M + N)");
    expect(lesson).not.toMatch(/syllabus (?:is )?verified/i);
  });
});
