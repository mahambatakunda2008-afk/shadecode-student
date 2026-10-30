import { describe, expect, it } from "vitest";
import { CHEMISTRY_PRACTICAL_QUALITATIVE_STARTER } from "./chemistry-practical-qualitative";
import { buildDeterministicLessonFallback } from "../lessonFallback";

describe("Chemistry qualitative analysis starter", () => {
  it("covers systematic tests, observations, inferences and safety", () => {
    const blocks = CHEMISTRY_PRACTICAL_QUALITATIVE_STARTER.blocks;
    const text = blocks.map((block) => block.content).join(" ").toLowerCase();
    expect(blocks.length).toBeGreaterThanOrEqual(12);
    for (const phrase of [
      "observation",
      "inference",
      "sodium hydroxide",
      "aqueous ammonia",
      "silver nitrate",
      "nitric acid",
      "limewater",
      "confirmatory",
      "fume cupboard",
    ]) {
      expect(text).toContain(phrase);
    }
  });

  it("is reachable through Chemistry qualitative-analysis fallback aliases", () => {
    for (const topic of ["qualitative analysis", "ion tests", "cation tests", "anion tests", "gas tests"]) {
      const lesson = buildDeterministicLessonFallback("Cambridge International AS Level Chemistry (9701)", topic);
      expect(lesson?.title).toContain("qualitative analysis");
      expect(lesson?.blocks.some((block) => block.type === "application")).toBe(true);
      expect(lesson?.blocks.some((block) => block.type === "exam")).toBe(true);
    }
  });

  it("does not present a learning reference table as exhaustive or verified practical evidence", () => {
    const text = CHEMISTRY_PRACTICAL_QUALITATIVE_STARTER.blocks.map((block) => block.content).join(" ").toLowerCase();
    expect(text).toContain("not a complete official qualitative-analysis table");
    expect(text).toContain("does not verify hands-on competence");
  });
});
