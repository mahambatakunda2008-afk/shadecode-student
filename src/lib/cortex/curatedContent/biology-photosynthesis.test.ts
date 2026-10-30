import { describe, expect, it } from "vitest";
import { BIOLOGY_PHOTOSYNTHESIS_STARTER } from "./biology-photosynthesis";

describe("Biology 9700 Topic 13 curated photosynthesis lesson", () => {
  const text = BIOLOGY_PHOTOSYNTHESIS_STARTER.blocks.map((block) => block.title + " " + block.content).join("\n");

  it("has a substantial, well-formed lesson with practical and exam coverage", () => {
    expect(BIOLOGY_PHOTOSYNTHESIS_STARTER.blocks.length).toBeGreaterThanOrEqual(25);
    expect(BIOLOGY_PHOTOSYNTHESIS_STARTER.blocks[0].type).toBe("objective");
    expect(BIOLOGY_PHOTOSYNTHESIS_STARTER.blocks.at(-1)?.type).toBe("summary");
    for (const block of BIOLOGY_PHOTOSYNTHESIS_STARTER.blocks) {
      expect(block.content.trim().length, block.title).toBeGreaterThan(40);
      expect(block.content.length, block.title).toBeLessThanOrEqual(1800);
    }
    expect(BIOLOGY_PHOTOSYNTHESIS_STARTER.blocks.some((block) => block.type === "diagram")).toBe(true);
    expect(BIOLOGY_PHOTOSYNTHESIS_STARTER.blocks.some((block) => block.type === "practice")).toBe(true);
    expect(BIOLOGY_PHOTOSYNTHESIS_STARTER.blocks.some((block) => block.type === "exam")).toBe(true);
  });

  it("covers all specified 13.1 and 13.2 concepts", () => {
    for (const term of ["chloroplast", "thylakoid", "stroma", "chlorophyll a", "chlorophyll b", "carotene", "xanthophyll", "absorption spectrum", "action spectrum", "chromatography", "Rf", "cyclic photophosphorylation", "non-cyclic photophosphorylation", "photosystem I", "photosystem II", "oxygen-evolving complex", "photolysis", "ATP synthase", "rubisco", "RuBP", "glycerate 3-phosphate", "triose phosphate", "light intensity", "carbon dioxide concentration", "temperature", "DCPIP", "methylene blue"]) {
      expect(text.toLowerCase()).toContain(term.toLowerCase());
    }
  });

  it("gets the Rf example right and distinguishes the two pathways", () => {
    expect(text).toContain("Rf = 36 ÷ 60 = 0.60");
    expect(text).toContain("PSI only");
    expect(text).toContain("PSI and PSII");
    expect(text).toContain("oxygen evolved during photosynthesis comes from water");
  });
});
