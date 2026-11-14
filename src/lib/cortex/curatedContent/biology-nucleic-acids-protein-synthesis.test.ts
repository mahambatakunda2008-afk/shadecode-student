import { describe, expect, it } from "vitest";
import { BIOLOGY_NUCLEIC_ACIDS_PROTEIN_SYNTHESIS_STARTER } from "./biology-nucleic-acids-protein-synthesis";
import { buildDeterministicLessonFallback } from "../lessonFallback";

describe("Biology 9700 nucleic acids and protein synthesis starter", () => {
  it("covers nucleic-acid structure, replication, transcription and translation", () => {
    const blocks = BIOLOGY_NUCLEIC_ACIDS_PROTEIN_SYNTHESIS_STARTER.blocks;
    const content = blocks.map(block => block.content).join(" ").toLowerCase();
    expect(blocks.length).toBeGreaterThanOrEqual(17);
    for (const phrase of ["deoxyribose", "ribose", "antiparallel", "phosphodiester", "semi-conservative", "template", "transcription", "translation", "codon", "anticodon", "peptide bond"]) {
      expect(content).toContain(phrase);
    }
  });

  it("keeps transcription and translation distinctions explicit", () => {
    const content = BIOLOGY_NUCLEIC_ACIDS_PROTEIN_SYNTHESIS_STARTER.blocks.map(block => block.content).join(" ").toLowerCase();
    expect(content).toContain("uracil");
    expect(content).toContain("stop codon");
    expect(content).toContain("one original strand");
    expect(content).toContain("one newly synthesised strand");
  });

  it("is reachable through Biology topic 6 aliases without subject leakage", () => {
    for (const topic of ["nucleic acids", "protein synthesis", "dna replication", "transcription", "translation"]) {
      const lesson = buildDeterministicLessonFallback("Cambridge International A Level Biology 9700", topic);
      expect(lesson).not.toBeNull();
      expect(lesson?.title ?? "").toContain("nucleic acids and protein synthesis");
      expect(lesson?.blocks.some(block => block.type === "practice")).toBe(true);
    }
    expect(buildDeterministicLessonFallback("Physics", "protein synthesis")).toBeNull();
  });
});
