import { describe, expect, it } from "vitest";
import { PHYSICS_PRACTICAL_PLANNING_STARTER } from "./physics-practical-planning";
import { buildDeterministicLessonFallback } from "../lessonFallback";

describe("Physics practical planning starter", () => {
  it("covers a reproducible investigation from variables to evaluation", () => {
    const blocks = PHYSICS_PRACTICAL_PLANNING_STARTER.blocks;
    const text = blocks.map((block) => block.content).join(" ").toLowerCase();
    expect(blocks.length).toBeGreaterThanOrEqual(14);
    for (const phrase of ["independent variable", "dependent variable", "control variables", "repeat", "range", "table", "gradient", "limitations", "improvement"]) {
      expect(text).toContain(phrase);
    }
  });

  it("is reachable through the offline Paper 5 topic route", () => {
    const lesson = buildDeterministicLessonFallback("Cambridge International AS Level Physics (9702)", "Help me with Paper 5 experimental planning and evaluation");
    expect(lesson?.title).toContain("planning");
    expect(lesson?.blocks.some((block) => block.type === "application")).toBe(true);
    expect(lesson?.blocks.some((block) => block.type === "exam")).toBe(true);
  });

  it("keeps planning evidence distinct from verified practical performance", () => {
    const text = PHYSICS_PRACTICAL_PLANNING_STARTER.blocks.map((block) => block.content).join(" ").toLowerCase();
    expect(text).toContain("until carried out with real apparatus");
    expect(text).toContain("teacher-observed practical evidence");
  });
});
