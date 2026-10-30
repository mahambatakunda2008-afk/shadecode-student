import { describe, expect, it } from "vitest";
import { CHEMISTRY_PRACTICAL_TITRATION_STARTER } from "./chemistry-practical-titration";
import { buildDeterministicLessonFallback } from "../lessonFallback";

describe("Chemistry practical titration starter", () => {
  it("teaches the practical workflow from apparatus to evaluation", () => {
    const blocks = CHEMISTRY_PRACTICAL_TITRATION_STARTER.blocks;
    const text = blocks.map((block) => block.content).join(" ").toLowerCase();
    expect(blocks.length).toBeGreaterThanOrEqual(16);
    for (const phrase of [
      "volumetric pipette",
      "condition",
      "eye level",
      "concordant",
      "balanced equation",
      "dm³",
      "percentage uncertainty",
      "teacher observation",
    ]) {
      expect(text).toContain(phrase.toLowerCase());
    }
  });

  it("includes a worked concentration calculation with a 1:1 mole ratio", () => {
    const text = CHEMISTRY_PRACTICAL_TITRATION_STARTER.blocks.map((block) => block.content).join(" ");
    expect(text).toContain("0.002480 mol");
    expect(text).toContain("0.09920 mol dm⁻³");
    expect(text).toContain("Never assume a 1:1 ratio");
  });

  it("is reachable through Cambridge 9701 offline fallback aliases", () => {
    for (const topic of ["titration", "acid base titration", "quantitative analysis", "volumetric analysis"]) {
      const lesson = buildDeterministicLessonFallback("Cambridge International AS Level Chemistry (9701)", topic);
      expect(lesson?.title).toContain("titration");
      expect(lesson?.blocks.some((block) => block.type === "application")).toBe(true);
      expect(lesson?.blocks.some((block) => block.type === "exam")).toBe(true);
    }
  });

  it("keeps simulated learning separate from hands-on competence", () => {
    const text = CHEMISTRY_PRACTICAL_TITRATION_STARTER.blocks.map((block) => block.content).join(" ").toLowerCase();
    expect(text).toContain("do not verify that you have performed a real titration");
    expect(text).toContain("teacher observation");
  });
});
