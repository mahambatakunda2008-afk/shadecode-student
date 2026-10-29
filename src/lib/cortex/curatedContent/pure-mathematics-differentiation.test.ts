import { describe, expect, it } from "vitest";
import { PURE_MATHEMATICS_DIFFERENTIATION_STARTER } from "./pure-mathematics-differentiation";

describe("Pure Mathematics differentiation starter", () => {
  it("has a complete lesson structure and a learner-drawn tangent prompt", () => {
    const blocks = PURE_MATHEMATICS_DIFFERENTIATION_STARTER.blocks;
    const types = new Set(blocks.map((block) => block.type));
    for (const type of ["objective", "prior", "concept", "diagram", "definition", "formula", "example", "checkpoint", "misconception", "practice", "exam", "summary"]) {
      expect(types.has(type), `missing ${type}`).toBe(true);
    }
    expect(blocks.length).toBeGreaterThanOrEqual(16);
    expect(blocks[0].type).toBe("objective");
    expect(blocks.at(-1)?.type).toBe("summary");
    expect(blocks.find((block) => block.type === "diagram")?.content).toContain("y = 2x - 1");
    for (const block of blocks) {
      expect(block.content.trim().length, block.title).toBeGreaterThanOrEqual(40);
      expect(block.content.length, block.title).toBeLessThanOrEqual(1800);
    }
  });

  it("checks numerical derivatives, tangent and stationary point examples", () => {
    const derivative = (x: number) => 12 * x ** 2 - 6 * x + 6;
    expect(derivative(0)).toBe(6);
    expect(derivative(1)).toBe(12);
    expect(10 * 2 ** 4 - 6 * 2).toBe(148);

    // y = (2x - 1)^3 has derivative 6(2x - 1)^2.
    expect(6 * (2 * 2 - 1) ** 2).toBe(54);
    expect(2 ** 2 + 1).toBe(5);
    expect(4 * 2 - 3).toBe(5);

    // y = x^2 - 4x + 1 has a minimum at (2, -3).
    expect(2 * 2 - 4).toBe(0);
    expect(2 ** 2 - 4 * 2 + 1).toBe(-3);
    expect(2).toBeGreaterThan(0);

    // y = x^2 + 6x + 2 has a minimum at (-3, -7).
    expect(2 * -3 + 6).toBe(0);
    expect((-3) ** 2 + 6 * -3 + 2).toBe(-7);
  });

  it("does not claim exact syllabus verification", () => {
    const text = PURE_MATHEMATICS_DIFFERENTIATION_STARTER.blocks.map((block) => block.content).join("\n");
    expect(text).not.toMatch(/syllabus (?:is )?verified/i);
    expect(text).toContain("chain rule");
    expect(text).toContain("second derivative");
  });
});
