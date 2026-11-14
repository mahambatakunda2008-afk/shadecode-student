import { describe, expect, it } from "vitest";
import { BIOLOGY_CLASSIFICATION_BIODIVERSITY_STARTER } from "./biology-classification-biodiversity";
import { buildDeterministicLessonFallback } from "../lessonFallback";

describe("Biology 9700 Topic 18 classification, biodiversity and conservation lesson", () => {
  const blocks = BIOLOGY_CLASSIFICATION_BIODIVERSITY_STARTER.blocks;
  const text = blocks.map((block) => block.title + " " + block.content).join("\n").toLowerCase();

  it("contains substantial teaching, field methods, calculations, diagrams and exam transfer", () => {
    expect(blocks.length).toBeGreaterThanOrEqual(35);
    expect(blocks[0].type).toBe("objective");
    expect(blocks.at(-1)?.type).toBe("summary");
    expect(blocks.filter((block) => block.type === "diagram").length).toBeGreaterThanOrEqual(3);
    expect(blocks.filter((block) => block.type === "calculation").length).toBeGreaterThanOrEqual(5);
    expect(blocks.some((block) => block.type === "practice")).toBe(true);
    expect(blocks.some((block) => block.type === "exam")).toBe(true);
    for (const block of blocks) {
      expect(block.content.trim().length, block.title).toBeGreaterThan(40);
      expect(block.content.length, block.title).toBeLessThanOrEqual(1800);
    }
  });

  it("covers classification, biodiversity assessment and conservation outcomes", () => {
    for (const term of ["biological species concept", "morphological species concept", "ecological species concept", "Archaea", "Bacteria", "Eukarya", "ribosomal RNA", "Protoctista", "Fungi", "Plantae", "Animalia", "single-stranded", "double-stranded", "ecosystem", "niche", "random sampling", "frame quadrats", "line transects", "belt transects", "Lincoln index", "Spearman", "Pearson", "Simpson's index", "climate change", "habitat", "seed banks", "frozen zoos", "IVF", "embryo transfer", "surrogacy", "invasive alien species", "IUCN", "CITES"]) {
      expect(text).toContain(term.toLowerCase());
    }
  });

  it("routes Topic 18 aliases to Biology only", () => {
    for (const topic of ["classification, biodiversity and conservation", "classification", "three domains", "Archaea", "Bacteria", "Eukarya", "taxonomic hierarchy", "Protoctista", "fungi", "plant kingdom", "animal kingdom", "virus classification", "biodiversity", "ecosystem", "ecological niche", "random sampling", "quadrats", "line transect", "belt transect", "mark-release-recapture", "Lincoln index", "Spearman rank", "Pearson correlation", "Simpson's index", "conservation", "seed banks", "frozen zoos", "assisted reproduction", "invasive alien species", "IUCN", "CITES"]) {
      expect(buildDeterministicLessonFallback("Cambridge International AS & A Level Biology 9700", topic)?.title, topic).toContain("Classification, biodiversity and conservation");
    }
    expect(buildDeterministicLessonFallback("Chemistry", "biodiversity")).toBeNull();
    expect(buildDeterministicLessonFallback("Physics", "Simpson's index")).toBeNull();
  });
});
