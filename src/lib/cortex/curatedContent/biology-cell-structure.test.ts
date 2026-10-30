import { describe, expect, it } from "vitest";
import { BIOLOGY_CELL_STRUCTURE_STARTER } from "./biology-cell-structure";
import { buildDeterministicLessonFallback } from "../lessonFallback";

describe("Biology 9700 cell structure starter", () => {
  it("covers cell types, organelles, specialisation and microscopy calculations", () => {
    const blocks = BIOLOGY_CELL_STRUCTURE_STARTER.blocks;
    const content = blocks.map(block => block.content).join(" ").toLowerCase();
    expect(blocks.length).toBeGreaterThanOrEqual(15);
    for (const phrase of ["prokaryotic", "eukaryotic", "nucleus", "mitochondria", "chloroplasts", "ribosomes", "specialised", "resolution", "actual size"]) {
      expect(content).toContain(phrase);
    }
  });

  it("is reachable through Biology topic 1 aliases", () => {
    for (const topic of ["cell structure", "cells", "prokaryotic and eukaryotic cells", "organelles"]) {
      const lesson = buildDeterministicLessonFallback("Cambridge International A Level Biology 9700", topic);
      expect(lesson).not.toBeNull();
      expect(lesson?.title ?? "").toContain("cell structure");
      expect(lesson?.blocks.some(block => block.type === "practice")).toBe(true);
    }
  });
});
