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

  it("checks polynomial-division identities across multiple values", () => {
    const evaluate = (coefficients: number[], x: number) =>
      coefficients.reduce((sum, coefficient) => sum * x + coefficient, 0);

    // x^3 + 2x^2 - x + 3 = (x + 2)(x^2 - 1) + 5
    for (const x of [-3, -2, -1, 0, 1, 2, 4]) {
      const dividend = evaluate([1, 2, -1, 3], x);
      const quotient = evaluate([1, 0, -1], x);
      expect((x + 2) * quotient + 5).toBe(dividend);
    }

    // 2x^2 + x - 3 = (x + 2)(2x - 3) + 3
    for (const x of [-3, -2, -1, 0, 1, 3]) {
      const dividend = evaluate([2, 1, -3], x);
      const quotient = evaluate([2, -3], x);
      expect((x + 2) * quotient + 3).toBe(dividend);
    }
  });

  it("covers the reflected modulus-graph interval and corner values", () => {
    const graph = PURE_MATHEMATICS_ALGEBRA_STARTER.blocks.find((block) =>
      block.title === "Worked graph sketch: y = |x² − 4|",
    );
    expect(graph?.content).toContain("4 − x² for −2 ≤ x ≤ 2");
    expect(graph?.content).toContain("x² − 4 for x < −2 or x > 2");
    expect(Math.abs(0 ** 2 - 4)).toBe(4);
    expect(Math.abs((-2) ** 2 - 4)).toBe(0);
    expect(Math.abs(2 ** 2 - 4)).toBe(0);
  });

  it("checks the polynomial-division answers printed in the lesson", () => {
    const blocks = PURE_MATHEMATICS_ALGEBRA_STARTER.blocks;
    const division = blocks.find((block) => block.title === "Worked example: division with a non-zero remainder");
    const exactDivision = blocks.find((block) => block.title === "Worked example: divide by a linear expression");
    const practice = blocks.find((block) => block.title === "Practice questions with worked answers");

    expect(division?.content).toContain("quotient = x² − 1 and remainder = 5");
    expect(division?.content).toContain("x³ + 2x² − x + 3 = (x + 2)(x² − 1) + 5");
    expect(exactDivision?.content).toContain("Quotient = 2x − 1, remainder = 0");
    expect(exactDivision?.content).toContain("2x² + 3x − 2 = (x + 2)(2x − 1)");
    expect(practice?.content).toContain("Quotient = 2x − 3, remainder = 3");
    expect(practice?.content).toContain("full factorisation is (x − 3)(x − 2)(x + 2)");

    const p = (x: number) => x ** 3 + 2 * x ** 2 - x + 3;
    const q = (x: number) => (x + 2) * (x ** 2 - 1) + 5;
    for (const x of [-3, -2, -1, 0, 1, 2, 4]) expect(q(x)).toBe(p(x));

    const dividend = (x: number) => 2 * x ** 2 + 3 * x - 2;
    const quotient = (x: number) => (x + 2) * (2 * x - 1);
    for (const x of [-3, -2, -1, 0, 1, 3]) expect(quotient(x)).toBeCloseTo(dividend(x), 10);
  });

  it("does not claim syllabus verification", () => {
    expect(PURE_MATHEMATICS_ALGEBRA_STARTER.title).toMatch(/algebra/i);
    const visibleLesson = PURE_MATHEMATICS_ALGEBRA_STARTER.blocks.map((block) => block.content).join("\n");
    expect(visibleLesson).not.toMatch(/syllabus (?:is )?verified/i);
  });
});
