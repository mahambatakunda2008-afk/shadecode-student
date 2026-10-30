import { describe, expect, it } from "vitest";
import { BIOLOGY_INHERITANCE_STARTER } from "./biology-inheritance";
import { buildDeterministicLessonFallback } from "../lessonFallback";

describe("Biology 9700 Topic 16 inheritance lesson", () => {
  const blocks = BIOLOGY_INHERITANCE_STARTER.blocks;
  const text = blocks.map((block) => block.title + " " + block.content).join("\n").toLowerCase();

  it("contains substantial teaching, diagrams, practice and exam transfer", () => {
    expect(blocks.length).toBeGreaterThanOrEqual(35);
    expect(blocks[0].type).toBe("objective");
    expect(blocks.at(-1)?.type).toBe("summary");
    expect(blocks.filter((block) => block.type === "diagram").length).toBeGreaterThanOrEqual(6);
    expect(blocks.some((block) => block.type === "practice")).toBe(true);
    expect(blocks.some((block) => block.type === "exam")).toBe(true);
    for (const block of blocks) {
      expect(block.content.trim().length, block.title).toBeGreaterThan(40);
      expect(block.content.length, block.title).toBeLessThanOrEqual(1800);
    }
  });

  it("covers the syllabus outcomes and important worked skills", () => {
    for (const term of ["haploid", "diploid", "homologous", "meiosis I", "meiosis II", "crossing over", "independent assortment", "random fertilisation", "Punnett square", "monohybrid", "dihybrid", "codominance", "multiple alleles", "sex linkage", "autosomal linkage", "epistasis", "test cross", "chi-squared", "TYR", "tyrosinase", "albinism", "HBB", "sickle cell", "F8", "factor VIII", "haemophilia", "HTT", "huntingtin", "Huntington", "Le allele", "structural gene", "regulatory gene", "repressible", "inducible", "lac operon", "transcription factors", "DELLA"]) {
      expect(text).toContain(term.toLowerCase());
    }
  });

  it("routes inheritance to Biology and avoids other subjects", () => {
    for (const topic of ["inheritance", "meiosis", "crossing over", "Punnett square", "monohybrid cross", "dihybrid cross", "codominance", "sex linkage", "autosomal linkage", "epistasis", "test cross", "chi-squared", "lac operon", "gene control", "DELLA protein", "sickle cell anaemia"]) {
      expect(buildDeterministicLessonFallback("Cambridge International AS & A Level Biology 9700", topic)?.title).toContain("Inheritance");
    }
    expect(buildDeterministicLessonFallback("Chemistry", "meiosis")).toBeNull();
    expect(buildDeterministicLessonFallback("Physics", "Punnett square")).toBeNull();
  });
});
