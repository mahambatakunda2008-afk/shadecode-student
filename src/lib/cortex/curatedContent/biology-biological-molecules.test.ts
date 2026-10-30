import { describe, expect, it } from "vitest";
import { BIOLOGY_BIOLOGICAL_MOLECULES_STARTER } from "./biology-biological-molecules";
import { buildDeterministicLessonFallback } from "../lessonFallback";

describe("Biology 9700 biological molecules starter", () => {
  it("covers water, carbohydrates, lipids, proteins and food tests", () => {
    const blocks = BIOLOGY_BIOLOGICAL_MOLECULES_STARTER.blocks;
    const content = blocks.map(block => block.content).join(" ").toLowerCase();
    expect(blocks.length).toBeGreaterThanOrEqual(17);
    for (const phrase of ["hydrogen bonds", "glycosidic bond", "cellulose", "triglyceride", "phospholipid", "peptide bond", "primary structure", "benedict"]) {
      expect(content).toContain(phrase);
    }
  });

  it("is reachable through Biology topic 2 aliases", () => {
    for (const topic of ["biological molecules", "carbohydrates", "lipids", "proteins", "water"]) {
      const lesson = buildDeterministicLessonFallback("Cambridge International A Level Biology 9700", topic);
      expect(lesson).not.toBeNull();
      expect(lesson?.title ?? "").toContain("biological molecules");
      expect(lesson?.blocks.some(block => block.type === "practice")).toBe(true);
    }
  });
});
