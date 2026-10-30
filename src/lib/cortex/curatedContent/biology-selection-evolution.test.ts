import { describe, expect, it } from "vitest";
import { BIOLOGY_SELECTION_EVOLUTION_STARTER } from "./biology-selection-evolution";
import { buildDeterministicLessonFallback } from "../lessonFallback";

describe("Biology 9700 Topic 17 selection and evolution lesson", () => {
  const blocks = BIOLOGY_SELECTION_EVOLUTION_STARTER.blocks;
  const text = blocks.map((block) => block.title + " " + block.content).join("\n").toLowerCase();

  it("contains substantial teaching, diagrams, worked examples, practice and exam transfer", () => {
    expect(blocks.length).toBeGreaterThanOrEqual(30);
    expect(blocks[0].type).toBe("objective");
    expect(blocks.at(-1)?.type).toBe("summary");
    expect(blocks.filter((block) => block.type === "diagram").length).toBeGreaterThanOrEqual(4);
    expect(blocks.some((block) => block.type === "calculation")).toBe(true);
    expect(blocks.some((block) => block.type === "practice")).toBe(true);
    expect(blocks.some((block) => block.type === "exam")).toBe(true);
    for (const block of blocks) {
      expect(block.content.trim().length, block.title).toBeGreaterThan(40);
      expect(block.content.length, block.title).toBeLessThanOrEqual(1800);
    }
  });

  it("covers variation, statistics, selection, population genetics and speciation", () => {
    for (const term of ["phenotypic variation", "discontinuous variation", "continuous variation", "t-test", "directional selection", "stabilising selection", "disruptive selection", "genetic drift", "founder effect", "bottleneck", "Hardy–Weinberg", "p² + 2pq + q²", "selective breeding", "dairy cattle", "maize", "gene pool", "DNA base sequences", "allopatric", "sympatric", "ecological", "behavioural"]) {
      expect(text).toContain(term.toLowerCase());
    }
  });

  it("routes Topic 17 aliases to Biology only", () => {
    for (const topic of ["selection and evolution", "variation", "continuous variation", "discontinuous variation", "t-test", "natural selection", "directional selection", "stabilising selection", "disruptive selection", "genetic drift", "founder effect", "bottleneck effect", "antibiotic resistance", "Hardy–Weinberg", "selective breeding", "artificial selection", "speciation", "allopatric speciation", "sympatric speciation", "gene pool", "evolutionary relationships"]) {
      expect(buildDeterministicLessonFallback("Cambridge International AS & A Level Biology 9700", topic)?.title, topic).toContain("Selection and evolution");
    }
    expect(buildDeterministicLessonFallback("Chemistry", "natural selection")).toBeNull();
    expect(buildDeterministicLessonFallback("Physics", "Hardy–Weinberg")).toBeNull();
  });
});
