import { describe, expect, it } from "vitest";
import { BIOLOGY_GENETIC_TECHNOLOGY_STARTER } from "./biology-genetic-technology";
import { buildDeterministicLessonFallback } from "../lessonFallback";

describe("Biology 9700 Topic 19 genetic technology lesson", () => {
  const blocks = BIOLOGY_GENETIC_TECHNOLOGY_STARTER.blocks;
  const text = blocks.map((block) => block.title + " " + block.content).join("\n").toLowerCase();

  it("contains substantial original teaching, diagrams and exam transfer", () => {
    expect(blocks.length).toBeGreaterThanOrEqual(28);
    expect(blocks[0].type).toBe("objective");
    expect(blocks.at(-1)?.type).toBe("summary");
    expect(blocks.filter((block) => block.type === "diagram").length).toBeGreaterThanOrEqual(4);
    expect(blocks.some((block) => block.type === "practice")).toBe(true);
    expect(blocks.some((block) => block.type === "exam")).toBe(true);
    for (const block of blocks) {
      expect(block.content.trim().length, block.title).toBeGreaterThan(40);
      expect(block.content.length, block.title).toBeLessThanOrEqual(1800);
    }
  });

  it("covers gene transfer, molecular tools, medicine and agricultural GMOs", () => {
    for (const term of ["recombinant DNA", "restriction endonucleases", "DNA ligase", "plasmid", "promoter", "reverse transcriptase", "DNA polymerase", "marker gene", "gene editing", "denaturation", "annealing", "Taq polymerase", "gel electrophoresis", "positive electrode", "microarray", "hybridise", "nucleotide sequences", "amino acid sequences", "protein structures", "insulin", "factor VIII", "adenosine deaminase", "BRCA1", "BRCA2", "Huntington", "cystic fibrosis", "gene therapy", "SCID", "retinal", "GM salmon", "herbicide-resistant soybean", "insect-resistant cotton", "ethical", "social"]) {
      expect(text).toContain(term.toLowerCase());
    }
  });

  it("routes Topic 19 aliases to Biology only", () => {
    for (const topic of ["genetic technology", "genetic engineering", "recombinant DNA", "gene transfer", "restriction enzymes", "DNA ligase", "plasmids", "PCR", "polymerase chain reaction", "gel electrophoresis", "DNA microarrays", "sequence databases", "recombinant proteins", "genetic screening", "BRCA1", "gene therapy", "SCID", "GM salmon", "herbicide resistance", "Bt cotton"]) {
      expect(buildDeterministicLessonFallback("Cambridge International AS & A Level Biology 9700", topic)?.title, topic).toContain("Genetic technology");
    }
    expect(buildDeterministicLessonFallback("Chemistry", "PCR")).toBeNull();
    expect(buildDeterministicLessonFallback("Physics", "gene therapy")).toBeNull();
  });
});
