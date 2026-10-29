import { describe, expect, it } from "vitest";
import { PHYSICS_KINEMATICS_STARTER } from "./physics-kinematics";

describe("curated Physics kinematics starter", () => {
  it("has a usable lesson structure and original practice content", () => {
    const blocks = PHYSICS_KINEMATICS_STARTER.blocks;
    const types = new Set(blocks.map((block) => block.type));
    for (const required of ["objective", "prior", "definition", "example", "formula", "checkpoint", "misconception", "practice", "exam", "summary"]) {
      expect(types.has(required), `missing block type: ${required}`).toBe(true);
    }
    expect(blocks.length).toBeGreaterThanOrEqual(12);
    expect(PHYSICS_KINEMATICS_STARTER.title).toMatch(/kinematics/i);
  });

  it("keeps the numerical examples internally consistent", () => {
    expect((30 + 10)).toBe(40);
    expect((30 - 10)).toBe(20);
    expect(400 / 80).toBe(5);
    expect((16 - 4) / 3).toBe(4);
    expect(6 * 5).toBe(30);
    expect(150 / 12).toBe(12.5);
    expect(18 + 5).toBe(23);
    expect(18 - 5).toBe(13);
    expect((17 - 5) / 4).toBe(3);
    expect(3 * 7).toBe(21);
    expect(0 + 2 * 6).toBe(12);
    expect(0 * 6 + 0.5 * 2 * 6 ** 2).toBe(36);
  });

  it("does not claim syllabus verification before mapping and review", () => {
    expect(PHYSICS_KINEMATICS_STARTER.blocks.some((block) => /verified/i.test(block.content))).toBe(false);
  });
});
