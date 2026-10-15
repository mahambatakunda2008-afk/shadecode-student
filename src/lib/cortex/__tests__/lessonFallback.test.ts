import { describe, expect, it } from "vitest";
import { buildDeterministicLessonFallback } from "../lessonFallback";

describe("deterministic lesson recovery", () => {
  it("returns a complete authored Physics waves lesson when providers are unavailable", () => {
    const lesson = buildDeterministicLessonFallback("Physics 9702 AS Level", "Waves");

    expect(lesson).not.toBeNull();
    expect(lesson?.title).toContain("Waves");
    expect((lesson?.blocks.length ?? 0)).toBeGreaterThanOrEqual(14);
    expect(lesson?.blocks.some((block) => block.content.includes("v = fλ"))).toBe(true);
  });

  it("matches natural-language requests without changing the subject", () => {
    const lesson = buildDeterministicLessonFallback("AS Physics", "Please teach me waves");

    expect(lesson?.title).toContain("Waves");
    expect(buildDeterministicLessonFallback("Computer Science", "Waves")).toBeNull();
  });

  it("returns no invented fallback for an uncovered topic", () => {
    expect(buildDeterministicLessonFallback("Physics", "quantum field theory")).toBeNull();
  });
});
