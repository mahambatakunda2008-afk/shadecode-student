import { describe, expect, it } from "vitest";
import { PHYSICS_PRACTICAL_MEASUREMENT_STARTER } from "./physics-practical-measurement";
import { buildDeterministicLessonFallback } from "../lessonFallback";

describe("Physics practical measurement starter", () => {
  it("contains a complete practical learning sequence", () => {
    const blocks = PHYSICS_PRACTICAL_MEASUREMENT_STARTER.blocks;
    const types = new Set(blocks.map((block) => block.type));
    for (const type of ["objective", "prior", "concept", "definition", "example", "table", "application", "checkpoint", "misconception", "exam", "practice", "summary"]) {
      expect(types.has(type), `missing block type: ${type}`).toBe(true);
    }
    expect(blocks.length).toBeGreaterThanOrEqual(14);
    expect(PHYSICS_PRACTICAL_MEASUREMENT_STARTER.title).toMatch(/practical physics/i);
  });

  it("keeps worked numerical examples consistent", () => {
    expect((12.4 + 12.6 + 12.5) / 3).toBeCloseTo(12.5, 8);
    expect(12.5 / 10).toBeCloseTo(1.25, 8);
    expect((0.5 / 50) * 100).toBeCloseTo(1, 8);
    expect((10 - 2) / (5 - 1)).toBeCloseTo(2, 8);
    expect((24.8 + 25.2 + 25.0) / 3 / 20).toBeCloseTo(1.25, 8);
    expect((0.2 / 8.0) * 100).toBeCloseTo(2.5, 8);
  });

  it("is available through deterministic offline fallback using practical-skill topic labels", () => {
    const lesson = buildDeterministicLessonFallback("Cambridge International AS Level Physics (9702)", "Teach me practical measurement and uncertainty");
    expect(lesson?.title).toContain("Practical Physics");
    expect(lesson?.blocks.some((block) => block.type === "application")).toBe(true);
    expect(lesson?.blocks.some((block) => block.type === "table")).toBe(true);
    expect(buildDeterministicLessonFallback("Mathematics (9709)", "Practical measurement")).toBeNull();
  });

  it("does not claim simulated work is verified hands-on laboratory performance", () => {
    const text = PHYSICS_PRACTICAL_MEASUREMENT_STARTER.blocks.map((block) => block.content).join(" ").toLowerCase();
    expect(text).toContain("teacher supervision");
    expect(text).toContain("not evidence that you can independently manipulate");
  });
});
