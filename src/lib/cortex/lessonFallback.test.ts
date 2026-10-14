import { describe, expect, it } from "vitest";
import { buildDeterministicLessonFallback } from "./lessonFallback";

describe("buildDeterministicLessonFallback", () => {
  it("returns the curated numerical-equations lesson for a direct topic match", () => {
    const lesson = buildDeterministicLessonFallback("Mathematics", "Numerical solution of equations");

    expect(lesson?.title).toContain("Numerical solution of equations");
    expect(lesson?.blocks.length).toBeGreaterThanOrEqual(10);
    expect(lesson?.blocks.some((block) => block.type === "example")).toBe(true);
    expect(lesson?.blocks.some((block) => block.type === "practice")).toBe(true);
  });

  it("normalizes common subject labels and surrounding request wording", () => {
    const lesson = buildDeterministicLessonFallback(
      "Maths AS Level 9709",
      "Numerical solution of equations please",
    );

    expect(lesson?.title).toContain("Numerical solution of equations");
  });

  it("does not return a lesson for a different subject", () => {
    expect(
      buildDeterministicLessonFallback("Physics", "Numerical solution of equations"),
    ).toBeNull();
  });

  it("does not pretend to cover an uncurated mathematics topic", () => {
    expect(
      buildDeterministicLessonFallback("Mathematics", "Differential equations"),
    ).toBeNull();
  });
  it("returns a curated trigonometric-integration lesson when cloud generation is unavailable", () => {
    const lesson = buildDeterministicLessonFallback(
      "Mathematics AS Level 9709",
      "Please teach me trigonometric integration",
    );

    expect(lesson?.title).toContain("Trigonometric integration");
    expect(lesson?.blocks.length).toBeGreaterThanOrEqual(10);
    expect(lesson?.blocks.some((block) => block.type === "example")).toBe(true);
    expect(lesson?.blocks.some((block) => block.type === "summary")).toBe(true);
  });

  it("does not return the trigonometric-integration lesson for another subject", () => {
    expect(
      buildDeterministicLessonFallback("Physics", "Trigonometric integration"),
    ).toBeNull();
  });

});