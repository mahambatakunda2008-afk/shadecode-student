import { describe, expect, it } from "vitest";
import { PHYSICS_MOMENTUM_STARTER } from "./physics-momentum";

describe("PHYSICS_MOMENTUM_STARTER", () => {
  it("contains a complete teach-practise-check lesson structure", () => {
    const blocks = PHYSICS_MOMENTUM_STARTER.blocks;

    expect(PHYSICS_MOMENTUM_STARTER.title).toContain("Momentum and impulse");
    expect(blocks.length).toBeGreaterThanOrEqual(14);
    for (const type of ["objective", "definition", "example", "diagram", "checkpoint", "practice", "exam", "summary"]) {
      expect(blocks.some((block) => block.type === type), `expected a ${type} block`).toBe(true);
    }
    expect(blocks.every((block) => block.content.trim().length > 0)).toBe(true);
  });

  it("keeps the signed-momentum and impulse examples arithmetically consistent", () => {
    const blocks = PHYSICS_MOMENTUM_STARTER.blocks;
    const momentumExample = blocks.find((block) => block.title === "Worked example: calculate signed momentum");
    const forceExample = blocks.find((block) => block.title === "Worked example: average force during a stop");

    expect(0.40 * 3.0).toBeCloseTo(1.2, 10);
    expect(0.15 * (0 - 20)).toBeCloseTo(-3.0, 10);
    expect(-3.0 / 0.050).toBeCloseTo(-60, 10);
    expect(momentumExample?.content).toContain("+1.2 kg m s⁻¹");
    expect(forceExample?.content).toContain("−60 N");
  });

  it("checks conservation-of-momentum and force-time area examples", () => {
    const collisionExample = PHYSICS_MOMENTUM_STARTER.blocks.find((block) => block.title === "Worked example: two trolleys couple together");
    const practice = PHYSICS_MOMENTUM_STARTER.blocks.find((block) => block.type === "practice");

    expect((0.60 * 2.0 + 0.40 * 0) / (0.60 + 0.40)).toBeCloseTo(1.2, 10);
    expect(0.5 * 0.10 * 80).toBeCloseTo(4.0, 10);
    expect(collisionExample?.content).toContain("v = +1.2 m s⁻¹");
    expect(practice?.content).toContain("impulse = ½ × 0.10 × 80 = 4.0 N s");
  });

  it("checks the direction reversal in the wall-collision exam example", () => {
    const exam = PHYSICS_MOMENTUM_STARTER.blocks.find((block) => block.type === "exam");
    const changeInMomentum = 0.25 * (-8.0) - 0.25 * 12;
    const averageForce = changeInMomentum / 0.010;

    expect(changeInMomentum).toBeCloseTo(-5.0, 10);
    expect(averageForce).toBeCloseTo(-500, 10);
    expect(exam?.content).toContain("−500 N");
    expect(exam?.content).toContain("force to the left");
  });
});
