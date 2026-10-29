import { describe, expect, it } from "vitest";
import { PURE_MATHEMATICS_ALGEBRA_STARTER } from "./pure-mathematics-algebra";

describe("Pure Mathematics algebra starter", () => {
  it("contains the core lesson sections", () => {
    const blocks = PURE_MATHEMATICS_ALGEBRA_STARTER.blocks;
    const types = new Set(blocks.map((block) => block.type));
    for (const type of ["objective", "prior", "definition", "example", "concept", "checkpoint", "misconception", "practice", "exam", "summary"]) {
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

  it("checks the arithmetic used by its worked examples", () => {
    expect(Math.abs(2 * 4 - 3)).toBe(5);
    expect(Math.abs(2 * -1 - 3)).toBe(5);
    expect(2 * 2 ** 3 - 3 * 2 + 4).toBe(14);
    const p = (x: number) => x ** 3 - 4 * x ** 2 + x + 6;
    expect(p(2)).toBe(0);
    expect(p(3)).toBe(0);
    expect(p(-1)).toBe(0);
    expect(3 * 2 + 1).toBe(7);
    expect(3 * (-8 / 3) + 1).toBe(-7);
    expect(2 ** 3 + 2 * 2 ** 2 - 5).toBe(11);
    expect((-1) ** 3 - 2 * (-1) + 1).toBe(2);
    expect((3 - 2) * (3 + 2)).toBe(5);
  });

  it("does not claim syllabus verification", () => {
    expect(PURE_MATHEMATICS_ALGEBRA_STARTER.title).toMatch(/algebra/i);
    const visibleLesson = PURE_MATHEMATICS_ALGEBRA_STARTER.blocks.map((block) => block.content).join("\n");
    expect(visibleLesson).not.toMatch(/syllabus (?:is )?verified/i);
  });
});
