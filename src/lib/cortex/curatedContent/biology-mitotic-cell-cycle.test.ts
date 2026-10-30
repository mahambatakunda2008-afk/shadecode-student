import { describe, expect, it } from "vitest";
import { BIOLOGY_MITOTIC_CELL_CYCLE_STARTER } from "./biology-mitotic-cell-cycle";
import { buildDeterministicLessonFallback } from "../lessonFallback";

describe("Biology 9700 mitotic cell cycle starter", () => {
  it("covers interphase, mitosis, cytokinesis and chromosome behaviour", () => {
    const blocks = BIOLOGY_MITOTIC_CELL_CYCLE_STARTER.blocks;
    const content = blocks.map(block => block.content).join(" ").toLowerCase();
    expect(blocks.length).toBeGreaterThanOrEqual(17);
    for (const phrase of ["interphase", "s phase", "sister chromatids", "metaphase", "anaphase", "telophase", "cytokinesis", "checkpoint"]) {
      expect(content).toContain(phrase);
    }
  });

  it("is reachable through Biology topic 5 aliases without subject leakage", () => {
    for (const topic of ["mitotic cell cycle", "mitosis", "cell cycle"]) {
      const lesson = buildDeterministicLessonFallback("Cambridge International A Level Biology 9700", topic);
      expect(lesson).not.toBeNull();
      expect(lesson?.title ?? "").toContain("mitotic cell cycle");
      expect(lesson?.blocks.some(block => block.type === "practice")).toBe(true);
    }
    expect(buildDeterministicLessonFallback("Physics", "Mitosis")).toBeNull();
  });
});
