import { describe, expect, it } from "vitest";
import { BIOLOGY_ENERGY_RESPIRATION_STARTER } from "./biology-energy-respiration";
import { buildDeterministicLessonFallback } from "../lessonFallback";

describe("Biology 9700 Topic 12 energy and respiration starter", () => {
  it("covers the A Level energy, respiration and practical strands", () => {
    const blocks = BIOLOGY_ENERGY_RESPIRATION_STARTER.blocks;
    const content = blocks.map(block => block.content).join(" ").toLowerCase();
    expect(blocks.length).toBeGreaterThanOrEqual(25);
    for (const phrase of [
      "active transport", "dna replication", "protein synthesis", "adenosine triphosphate",
      "substrate-linked phosphorylation", "chemiosmosis", "respiratory quotient",
      "germinating seeds", "glycolysis", "fructose 1,6-bisphosphate", "pyruvate",
      "coenzyme a", "oxaloacetate", "citrate", "dehydrogenation", "reduced nad",
      "reduced fad", "electron transport chain", "atp synthase", "final electron acceptor",
      "mitochondrial matrix", "inner mitochondrial membrane", "lactate", "ethanol",
      "aerenchyma", "dcpip", "methylene blue", "respirometer"
    ]) {
      expect(content).toContain(phrase);
    }
    expect(blocks.filter(block => block.type === "diagram").length).toBeGreaterThanOrEqual(2);
    expect(blocks.some(block => block.type === "practice")).toBe(true);
    expect(blocks.some(block => block.type === "exam")).toBe(true);
  });

  it("retrieves the lesson through Biology Topic 12 aliases without subject leakage", () => {
    for (const topic of [
      "energy and respiration", "energy", "respiration", "aerobic respiration",
      "anaerobic respiration", "glycolysis", "krebs cycle", "oxidative phosphorylation",
      "respiratory quotient", "respirometers", "fermentation"
    ]) {
      const lesson = buildDeterministicLessonFallback(
        "Cambridge International AS & A Level Biology 9700",
        topic
      );
      expect(lesson).not.toBeNull();
      expect(lesson?.title ?? "").toContain("energy and respiration");
    }
    expect(buildDeterministicLessonFallback("Chemistry", "respiration")).toBeNull();
    expect(buildDeterministicLessonFallback("Physics", "glycolysis")).toBeNull();
  });
});
