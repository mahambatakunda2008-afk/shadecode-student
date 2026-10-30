import { describe, expect, it } from "vitest";
import { BIOLOGY_HOMEOSTASIS_STARTER } from "./biology-homeostasis";
import { buildDeterministicLessonFallback } from "../lessonFallback";

describe("Biology 9700 Topic 14 homeostasis lesson", () => {
  const text = BIOLOGY_HOMEOSTASIS_STARTER.blocks.map((block) => block.title + " " + block.content).join("\n");

  it("is a substantial lesson with diagrams, practice and exam transfer", () => {
    const blocks = BIOLOGY_HOMEOSTASIS_STARTER.blocks;
    expect(blocks.length).toBeGreaterThanOrEqual(30);
    expect(blocks[0].type).toBe("objective");
    expect(blocks.at(-1)?.type).toBe("summary");
    expect(blocks.filter((block) => block.type === "diagram").length).toBeGreaterThanOrEqual(5);
    expect(blocks.some((block) => block.type === "practice")).toBe(true);
    expect(blocks.some((block) => block.type === "exam")).toBe(true);
    for (const block of blocks) {
      expect(block.content.trim().length, block.title).toBeGreaterThan(40);
      expect(block.content.length, block.title).toBeLessThanOrEqual(1800);
    }
  });

  it("covers mammalian and plant homeostasis outcomes", () => {
    for (const term of ["negative feedback", "deamination", "fibrous capsule", "renal pelvis", "glomerulus", "Bowman's capsule", "proximal convoluted tubule", "loop of Henle", "distal convoluted tubule", "collecting duct", "ultrafiltration", "selective reabsorption", "hypothalamus", "posterior pituitary", "ADH", "aquaporins", "glucagon", "G-protein", "adenylyl cyclase", "cAMP", "protein kinase A", "glycogen", "insulin", "glucose oxidase", "peroxidase", "biosensor", "stomata", "guard cells", "abscisic acid", "calcium ions", "daily rhythms"]) {
      expect(text.toLowerCase()).toContain(term.toLowerCase());
    }
  });

  it("routes only Biology homeostasis requests and prevents subject leakage", () => {
    for (const topic of ["homeostasis", "negative feedback", "kidney", "nephron", "ultrafiltration", "osmoregulation", "ADH", "blood glucose", "glucagon", "insulin", "stomata", "guard cells", "abscisic acid"]) {
      const lesson = buildDeterministicLessonFallback("Cambridge International AS & A Level Biology 9700", topic);
      expect(lesson?.title).toContain("Homeostasis");
    }
    expect(buildDeterministicLessonFallback("Chemistry", "homeostasis")).toBeNull();
    expect(buildDeterministicLessonFallback("Physics", "ADH")).toBeNull();
  });
});
