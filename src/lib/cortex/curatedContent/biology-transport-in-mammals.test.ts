import { describe, expect, it } from "vitest";
import { BIOLOGY_TRANSPORT_IN_MAMMALS_STARTER } from "./biology-transport-in-mammals";
import { buildDeterministicLessonFallback } from "../lessonFallback";

describe("Biology 9700 transport in mammals starter", () => {
  it("covers circulation, heart, vessels, blood, tissue fluid and oxygen transport", () => {
    const blocks = BIOLOGY_TRANSPORT_IN_MAMMALS_STARTER.blocks;
    const content = blocks.map(block => block.content).join(" ").toLowerCase();
    expect(blocks.length).toBeGreaterThanOrEqual(20);
    for (const phrase of ["double circulation", "pulmonary circuit", "systemic circuit", "left ventricle", "cardiac cycle", "cardiac output", "arteries", "veins", "capillaries", "haemoglobin", "oxygen dissociation curve", "bohr effect", "tissue fluid", "lymph", "sinoatrial node", "atrioventricular node", "purkyne tissue", "carbonic anhydrase", "haemoglobinic acid", "carbaminohaemoglobin", "chloride shift", "arterioles", "venules", "monocytes", "neutrophils", "specific heat"]) {
      expect(content).toContain(phrase);
    }
  });

  it("is reachable through Biology mammalian transport aliases without subject leakage", () => {
    for (const topic of ["transport in mammals", "mammalian circulation", "the heart", "blood vessels", "tissue fluid"]) {
      const lesson = buildDeterministicLessonFallback("Cambridge International A Level Biology 9700", topic);
      expect(lesson).not.toBeNull();
      expect(lesson?.title ?? "").toContain("transport in mammals");
      expect(lesson?.blocks.some(block => block.type === "practice")).toBe(true);
    }
    expect(buildDeterministicLessonFallback("Chemistry", "mammalian circulation")).toBeNull();
  });
});
