import { describe, expect, it } from "vitest";
import { BIOLOGY_TRANSPORT_IN_PLANTS_STARTER } from "./biology-transport-in-plants";
import { buildDeterministicLessonFallback } from "../lessonFallback";

describe("Biology 9700 transport in plants starter", () => {
  it("covers water uptake, xylem, transpiration and phloem", () => {
    const blocks = BIOLOGY_TRANSPORT_IN_PLANTS_STARTER.blocks;
    const content = blocks.map(block => block.content).join(" ").toLowerCase();
    expect(blocks.length).toBeGreaterThanOrEqual(17);
    for (const phrase of ["root hair", "osmosis", "apoplast", "symplast", "casparian strip", "lignin", "cohesion-tension", "transpiration", "potometer", "sieve tube", "companion cell", "source", "sink", "mass flow"]) {
      expect(content).toContain(phrase);
    }
  });

  it("distinguishes water uptake from transpiration and xylem from phloem", () => {
    const content = BIOLOGY_TRANSPORT_IN_PLANTS_STARTER.blocks.map(block => block.content).join(" ").toLowerCase();
    expect(content).toContain("not transpiration directly");
    expect(content).toContain("dead at maturity");
    expect(content).toContain("different directions");
  });

  it("is reachable through Biology topic 7 aliases without subject leakage", () => {
    for (const topic of ["transport in plants", "transpiration", "xylem", "phloem", "water transport in plants"]) {
      const lesson = buildDeterministicLessonFallback("Cambridge International A Level Biology 9700", topic);
      expect(lesson).not.toBeNull();
      expect(lesson?.title ?? "").toContain("transport in plants");
      expect(lesson?.blocks.some(block => block.type === "practice")).toBe(true);
    }
    expect(buildDeterministicLessonFallback("Chemistry", "transpiration")).toBeNull();
  });
});
