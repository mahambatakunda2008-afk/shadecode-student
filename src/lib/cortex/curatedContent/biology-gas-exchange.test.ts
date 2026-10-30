import { describe, expect, it } from "vitest";
import { BIOLOGY_GAS_EXCHANGE_STARTER } from "./biology-gas-exchange";
import { buildDeterministicLessonFallback } from "../lessonFallback";

describe("Biology 9700 Topic 9 gas exchange starter", () => {
  it("covers the official 9.1 structure, tissues, recognition and diffusion outcomes", () => {
    const blocks = BIOLOGY_GAS_EXCHANGE_STARTER.blocks;
    const text = blocks.map(block => block.content).join(" ").toLowerCase();
    expect(blocks.length).toBeGreaterThanOrEqual(19);
    for (const phrase of ["trachea", "bronchioles", "alveoli", "capillary network", "cartilage", "ciliated epithelium", "goblet cells", "squamous epithelium", "smooth muscle", "elastic fibres", "mucous glands", "transverse section", "partial pressure", "diffusion"]) {
      expect(text).toContain(phrase);
    }
    expect(blocks.some(block => block.type === "diagram" && block.content.toLowerCase().includes("plan diagram"))).toBe(true);
    expect(blocks.some(block => block.type === "practice")).toBe(true);
  });

  it("is reachable through Biology gas-exchange aliases without subject leakage", () => {
    for (const topic of ["gas exchange", "human gas exchange system", "alveoli", "trachea and bronchi", "gas exchange in humans"]) {
      const lesson = buildDeterministicLessonFallback("Cambridge International A Level Biology 9700", topic);
      expect(lesson).not.toBeNull();
      expect(lesson?.title ?? "").toContain("gas exchange");
      expect(lesson?.blocks.some(block => block.type === "practice")).toBe(true);
    }
    expect(buildDeterministicLessonFallback("Chemistry", "gas exchange")).toBeNull();
  });
});
