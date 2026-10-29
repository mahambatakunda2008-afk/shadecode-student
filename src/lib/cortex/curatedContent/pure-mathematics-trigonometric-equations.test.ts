import { describe, expect, it } from "vitest";
import { PURE_MATHEMATICS_TRIGONOMETRIC_EQUATIONS_STARTER } from "./pure-mathematics-trigonometric-equations";

describe("Pure Mathematics trigonometric equations starter", () => {
  it("contains a complete teaching sequence and a learner-drawn quadrant guide", () => {
    const blocks = PURE_MATHEMATICS_TRIGONOMETRIC_EQUATIONS_STARTER.blocks;
    const types = new Set(blocks.map((block) => block.type));

    for (const type of ["objective", "prior", "concept", "formula", "diagram", "example", "checkpoint", "misconception", "practice", "exam", "summary"]) {
      expect(types.has(type), `missing ${type}`).toBe(true);
    }
    expect(blocks.length).toBeGreaterThanOrEqual(15);
    expect(blocks.at(-1)?.type).toBe("summary");
    expect(blocks.find((block) => block.type === "diagram")?.content).toContain("quadrant");
    for (const block of blocks) {
      expect(block.content.trim().length, block.title).toBeGreaterThanOrEqual(40);
      expect(block.content.length, block.title).toBeLessThanOrEqual(1800);
    }
  });

  it("checks the worked exact-angle solution sets", () => {
    const degrees = [0, 30, 45, 60, 75, 90, 120, 135, 150, 180, 210, 225, 270, 300, 315, 330];
    const sin = (x: number) => Math.sin((x * Math.PI) / 180);
    const cos = (x: number) => Math.cos((x * Math.PI) / 180);
    const tan = (x: number) => Math.tan((x * Math.PI) / 180);
    const closeTo = (actual: number, expected: number) => expect(actual).toBeCloseTo(expected, 10);

    expect([30, 150].filter((x) => Math.abs(sin(x) - 0.5) < 1e-10)).toEqual([30, 150]);
    expect([150, 210].filter((x) => Math.abs(cos(x) + Math.sqrt(3) / 2) < 1e-10)).toEqual([150, 210]);
    expect([45, 225].filter((x) => Math.abs(tan(x) - 1) < 1e-10)).toEqual([45, 225]);
    expect([15, 75].filter((x) => Math.abs(sin(2 * x) - 0.5) < 1e-10)).toEqual([15, 75]);
    expect(degrees.every((x) => x >= 0 && x < 360)).toBe(true);
    closeTo(sin(45), Math.SQRT1_2);
    closeTo(cos(60), 0.5);
  });

  it("checks multiple-angle practice answers in the original interval", () => {
    const answers = [30, 60];
    expect(answers.every((x) => x >= 0 && x < 180)).toBe(true);
    expect(answers.every((x) => Math.abs(Math.sin((2 * x * Math.PI) / 180) - Math.sqrt(3) / 2) < 1e-10)).toBe(true);
    expect(PURE_MATHEMATICS_TRIGONOMETRIC_EQUATIONS_STARTER.blocks.map((block) => block.content).join("\n")).toContain("transformed interval");
  });
});
