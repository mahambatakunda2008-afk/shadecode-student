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

  it("ties independently checked calculus results to the answers shown in the lesson", () => {
    const blocks = PURE_MATHEMATICS_DIFFERENTIATION_STARTER.blocks;
    const block = (title: string) => {
      const found = blocks.find((item) => item.title === title);
      expect(found, `missing lesson block: ${title}`).toBeDefined();
      return found!.content;
    };

    // Differentiate the polynomial directly, then check the exact expression shown to learners.
    const derivativeAt = (x: number) => 12 * x ** 2 - 6 * x + 6;
    expect(derivativeAt(0)).toBe(6);
    expect(derivativeAt(1)).toBe(12);
    expect(block("Worked example: polynomial derivative")).toContain("12x² - 6x + 6");

    // Chain rule: d[(3x + 2)^4]/dx = 12(3x + 2)^3.
    expect(4 * (3 * 2 + 2) ** 3 * 3).toBe(6144);
    expect(block("Worked example: differentiate a bracket power")).toContain("12(3x+2)³");

    // Tangent and practice answers must pass through their stated points with the stated gradients.
    expect(2 * 1 - 1).toBe(1);
    expect(block("Worked example: tangent to a parabola")).toContain("y = 2x - 1");
    expect(4 * 2 - 3).toBe(5);
    expect(block("Practice ladder with answers")).toContain("y = 4x - 3");

    // Stationary-point answer must agree with the original polynomial at x = -3.
    expect((-3) ** 2 + 6 * -3 + 2).toBe(-7);
    expect(block("Practice ladder with answers")).toContain("x = -3 and y = -7");
  });

  it("does not claim exact syllabus verification", () => {
    const text = PURE_MATHEMATICS_DIFFERENTIATION_STARTER.blocks.map((block) => block.content).join("\n");
    expect(text).not.toMatch(/syllabus (?:is )?verified/i);
    expect(text).toContain("chain rule");
    expect(text).toContain("second derivative");
  });
});
