import { describe, expect, it } from "vitest";
import { CHEMISTRY_PRACTICAL_PLANNING_STARTER } from "./chemistry-practical-planning";
import { buildDeterministicLessonFallback } from "../lessonFallback";

describe("Chemistry practical planning starter", () => {
  it("covers the official Paper 5 skill groups with original teaching", () => {
    const blocks = CHEMISTRY_PRACTICAL_PLANNING_STARTER.blocks;
    const text = blocks.map((block) => block.content).join(" ").toLowerCase();
    expect(blocks.length).toBeGreaterThanOrEqual(14);
    for (const phrase of ["independent variable", "dependent variable", "hypothesis", "control variables", "apparatus", "safety", "data", "conclusion", "evaluation", "improvement"]) {
      expect(text).toContain(phrase);
    }
  });

  it("is reachable through Chemistry Paper 5 fallback aliases", () => {
    for (const topic of ["experimental planning", "planning and evaluation", "paper 5", "planning analysis and evaluation"]) {
      const lesson = buildDeterministicLessonFallback("Cambridge International A Level Chemistry (9701)", topic);
      expect(lesson?.title).toContain("planning, analysis and evaluation");
      expect(lesson?.blocks.some((block) => block.type === "practice")).toBe(true);
    }
  });

  it("does not claim a written lesson replaces supervised laboratory experience", () => {
    const text = CHEMISTRY_PRACTICAL_PLANNING_STARTER.blocks.map((block) => block.content).join(" ").toLowerCase();
    expect(text).toContain("extensive supervised a level laboratory work");
    expect(text).toContain("does not certify laboratory competence");
  });
});
