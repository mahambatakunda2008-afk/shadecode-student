import { describe, expect, it } from "vitest";
import { BIOLOGY_ENZYMES_STARTER } from "./biology-enzymes";
import { buildDeterministicLessonFallback } from "../lessonFallback";

describe("Biology 9700 enzymes starter", () => {
  it("covers catalysis, induced fit, activation energy and rate factors", () => {
    const blocks = BIOLOGY_ENZYMES_STARTER.blocks;
    const content = blocks.map(block => block.content).join(" ").toLowerCase();
    expect(blocks.length).toBeGreaterThanOrEqual(16);
    for (const phrase of ["induced fit", "activation energy", "denatured", "optimum ph", "substrate concentration", "initial rate", "enzyme-substrate complex"]) {
      expect(content).toContain(phrase);
    }
  });

  it("is reachable through Biology topic 3 aliases without subject leakage", () => {
    for (const topic of ["enzymes", "enzyme action", "enzyme activity"]) {
      const lesson = buildDeterministicLessonFallback("Cambridge International A Level Biology 9700", topic);
      expect(lesson).not.toBeNull();
      expect(lesson?.title ?? "").toContain("enzymes");
      expect(lesson?.blocks.some(block => block.type === "practice")).toBe(true);
    }
    expect(buildDeterministicLessonFallback("Chemistry", "Enzymes")).toBeNull();
  });
});
