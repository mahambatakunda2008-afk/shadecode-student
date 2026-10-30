import { describe, expect, it } from "vitest";
import { BIOLOGY_PRACTICAL_PLANNING_STARTER } from "./biology-practical-planning";
import { buildDeterministicLessonFallback } from "../lessonFallback";

describe("Biology practical planning starter", () => {
  it("covers the core Paper 5 planning and evaluation skills", () => {
    const blocks = BIOLOGY_PRACTICAL_PLANNING_STARTER.blocks;
    const content = blocks.map(block => block.content).join(" ").toLowerCase();
    expect(blocks.length).toBeGreaterThanOrEqual(14);
    for (const phrase of ["independent variable", "dependent variable", "control variables", "hypothesis", "sampling", "statistical methods", "conclusion", "systematic bias", "improvement"]) {
      expect(content).toContain(phrase);
    }
  });

  it("is reachable through Biology Paper 5 fallback aliases", () => {
    for (const topic of ["experimental planning", "planning and evaluation", "paper 5", "planning analysis and evaluation"]) {
      const lesson = buildDeterministicLessonFallback("Cambridge International A Level Biology (9700)", topic);
      expect(lesson).not.toBeNull();
      expect(lesson?.title ?? "").toContain("planning, analysis and evaluation");
      expect(lesson?.blocks.some(block => block.type === "practice")).toBe(true);
    }
  });

  it("does not claim a written lesson replaces laboratory experience", () => {
    const content = BIOLOGY_PRACTICAL_PLANNING_STARTER.blocks.map(block => block.content).join(" ").toLowerCase();
    expect(content).toContain("extensive supervised laboratory experience");
    expect(content).toContain("does not certify laboratory competence");
  });
});
