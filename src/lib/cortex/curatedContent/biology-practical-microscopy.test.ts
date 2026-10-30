import { describe, expect, it } from "vitest";
import { BIOLOGY_PRACTICAL_MICROSCOPY_STARTER } from "./biology-practical-microscopy";
import { buildDeterministicLessonFallback } from "../lessonFallback";

describe("Biology practical microscopy starter", () => {
  it("teaches microscopy, observation and measurement skills", () => {
    const blocks = BIOLOGY_PRACTICAL_MICROSCOPY_STARTER.blocks;
    const content = blocks.map(block => block.content).join(" ").toLowerCase();
    expect(blocks.length).toBeGreaterThanOrEqual(14);
    for (const phrase of ["light microscope", "coverslip", "total magnification", "actual size", "observation", "biological drawing", "units"]) {
      expect(content).toContain(phrase);
    }
  });

  it("is reachable through Biology Paper 3 fallback aliases", () => {
    for (const topic of ["microscopy", "microscope", "biological drawings", "specimen observation"]) {
      const lesson = buildDeterministicLessonFallback("Cambridge International A Level Biology (9700)", topic);
      expect(lesson).not.toBeNull();
      expect(lesson?.title ?? "").toContain("microscopy");
      expect(lesson?.blocks.some(block => block.type === "practice")).toBe(true);
    }
  });

  it("does not claim that a written lesson replaces hands-on microscopy", () => {
    const content = BIOLOGY_PRACTICAL_MICROSCOPY_STARTER.blocks.map(block => block.content).join(" ").toLowerCase();
    expect(content).toContain("cannot certify microscope or laboratory competence");
    expect(content).toContain("real specimens and equipment");
  });
});
