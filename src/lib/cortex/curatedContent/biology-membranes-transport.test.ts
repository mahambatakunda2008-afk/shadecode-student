import { describe, expect, it } from "vitest";
import { BIOLOGY_MEMBRANES_TRANSPORT_STARTER } from "./biology-membranes-transport";
import { buildDeterministicLessonFallback } from "../lessonFallback";

describe("Biology 9700 cell membranes and transport starter", () => {
  it("covers membrane structure and the main transport processes", () => {
    const blocks = BIOLOGY_MEMBRANES_TRANSPORT_STARTER.blocks;
    const content = blocks.map(block => block.content).join(" ").toLowerCase();
    expect(blocks.length).toBeGreaterThanOrEqual(17);
    for (const phrase of ["fluid mosaic", "phospholipid bilayer", "facilitated diffusion", "water potential", "active transport", "co-transport", "endocytosis", "exocytosis"]) {
      expect(content).toContain(phrase);
    }
  });

  it("is reachable through Biology topic 4 aliases without subject leakage", () => {
    for (const topic of ["cell membranes", "membrane transport", "transport across membranes"]) {
      const lesson = buildDeterministicLessonFallback("Cambridge International A Level Biology 9700", topic);
      expect(lesson).not.toBeNull();
      expect(lesson?.title ?? "").toContain("cell membranes");
      expect(lesson?.blocks.some(block => block.type === "practice")).toBe(true);
    }
    expect(buildDeterministicLessonFallback("Physics", "Cell membranes")).toBeNull();
  });
});
