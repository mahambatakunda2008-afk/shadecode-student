import { describe, expect, it } from "vitest";
import { buildDeterministicLessonFallback } from "./lessonFallback";

describe("buildDeterministicLessonFallback", () => {
  it("returns a curated lesson for an exact normalized subject and topic", () => {
    expect(buildDeterministicLessonFallback("Mathematics", "Coordinate Geometry")?.title)
      .toContain("Coordinate geometry");
  });

  it("accepts natural-language wrappers removed by topic normalization", () => {
    expect(buildDeterministicLessonFallback("Maths", "Please teach me coordinate geometry"))
      .toBeTruthy();
  });

  it("does not substitute a neighbouring or broader topic by substring", () => {
    expect(buildDeterministicLessonFallback("Mathematics", "Coordinate geometry applications"))
      .toBeNull();
    expect(buildDeterministicLessonFallback("Mathematics", "Differentiation"))
      .toBeNull();
  });


  it("does not match a theory alias embedded inside a different word", () => {
    expect(buildDeterministicLessonFallback("Computer Science", "prebinary search algorithm"))
      .toBeNull();
  });

  it("does not cross subject boundaries", () => {
    expect(buildDeterministicLessonFallback("Physics", "Coordinate geometry"))
      .toBeNull();
  });

  it("returns null for an unknown topic", () => {
    expect(buildDeterministicLessonFallback("Computer Science", "Advanced database normalisation"))
      .toBeNull();
  });
});
