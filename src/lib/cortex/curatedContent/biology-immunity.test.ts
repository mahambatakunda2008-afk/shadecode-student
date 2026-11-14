import { describe, expect, it } from "vitest";
import { BIOLOGY_IMMUNITY_STARTER } from "./biology-immunity";
import { buildDeterministicLessonFallback } from "../lessonFallback";

describe("Biology 9700 immunity starter", () => {
  it("covers phagocytes, specific responses, antibodies, monoclonals and vaccination", () => {
    const blocks = BIOLOGY_IMMUNITY_STARTER.blocks;
    const content = blocks.map(block => block.content).join(" ").toLowerCase();
    expect(blocks.length).toBeGreaterThanOrEqual(20);
    for (const phrase of ["neutrophils", "macrophages", "antigen", "self antigens", "non-self antigens", "b-lymphocytes", "plasma cells", "t-helper", "t-killer", "memory cells", "secondary response", "variable regions", "heavy chains", "light chains", "hybridoma", "monoclonal antibodies", "active immunity", "passive immunity", "vaccination programmes"]) {
      expect(content).toContain(phrase);
    }
    expect(blocks.filter(block => block.type === "diagram").length).toBeGreaterThanOrEqual(2);
    expect(blocks.some(block => block.type === "practice")).toBe(true);
  });

  it("is reachable through Biology Topic 11 aliases without subject leakage", () => {
    for (const topic of ["immunity", "immune system", "phagocytosis", "antibodies", "monoclonal antibodies", "vaccination", "active and passive immunity"]) {
      const lesson = buildDeterministicLessonFallback("Cambridge International AS & A Level Biology 9700", topic);
      expect(lesson).not.toBeNull();
      expect(lesson?.title ?? "").toContain("immunity");
    }
    expect(buildDeterministicLessonFallback("Chemistry", "immunity")).toBeNull();
  });
});
