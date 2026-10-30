import { describe, expect, it } from "vitest";
import { BIOLOGY_INFECTIOUS_DISEASES_STARTER } from "./biology-infectious-diseases";
import { buildDeterministicLessonFallback } from "../lessonFallback";

describe("Biology 9700 infectious diseases and antibiotics starter", () => {
  it("covers the named pathogens, transmission, prevention and antibiotic resistance", () => {
    const blocks = BIOLOGY_INFECTIOUS_DISEASES_STARTER.blocks;
    const content = blocks.map(block => block.content).join(" ").toLowerCase();
    expect(blocks.length).toBeGreaterThanOrEqual(18);
    for (const phrase of ["vibrio cholerae", "plasmodium falciparum", "anopheles", "mycobacterium tuberculosis", "mycobacterium bovis", "human immunodeficiency virus", "faecal", "aerosols", "peptidoglycan", "penicillin-binding proteins", "viral", "natural selection", "horizontal gene transfer", "stewardship"]) {
      expect(content).toContain(phrase);
    }
    expect(blocks.some(block => block.type === "diagram")).toBe(true);
    expect(blocks.some(block => block.type === "practice")).toBe(true);
  });

  it("is reachable through Biology Topic 10 aliases without subject leakage", () => {
    for (const topic of ["infectious diseases", "cholera", "malaria", "tuberculosis", "HIV", "antibiotics", "antibiotic resistance"]) {
      const lesson = buildDeterministicLessonFallback("Cambridge International AS & A Level Biology 9700", topic);
      expect(lesson).not.toBeNull();
      expect(lesson?.title ?? "").toContain("infectious diseases");
    }
    expect(buildDeterministicLessonFallback("Chemistry", "infectious diseases")).toBeNull();
  });
});
