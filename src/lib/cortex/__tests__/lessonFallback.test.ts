import { describe, expect, it } from "vitest";
import { buildDeterministicLessonFallback } from "../lessonFallback";

describe("deterministic lesson recovery", () => {
  it("returns a substantial authored Physics waves lesson when providers are unavailable", () => {
    const lesson = buildDeterministicLessonFallback("Physics 9702 AS Level", "Waves");

    expect(lesson).not.toBeNull();
    expect(lesson?.title).toContain("Waves");
    expect((lesson?.blocks.length ?? 0)).toBeGreaterThanOrEqual(14);
    expect(lesson?.blocks.some((block) => block.content.includes("v = fλ"))).toBe(true);
    expect(lesson?.blocks.some((block) => block.type === "example")).toBe(true);
    expect(lesson?.blocks.some((block) => block.type === "checkpoint")).toBe(true);
  });

  it("normalizes curriculum aliases and natural-language topic requests", () => {
    const byAlias = buildDeterministicLessonFallback("AS Physics", "Please teach me waves");
    const byCode = buildDeterministicLessonFallback("Physics (9702)", "Waves topic");

    expect(byAlias?.title).toContain("Waves");
    expect(byCode?.title).toContain("Waves");
  });

  it("never crosses subject boundaries when a topic name overlaps", () => {
    expect(buildDeterministicLessonFallback("Computer Science", "Waves")).toBeNull();
    expect(buildDeterministicLessonFallback("Chemistry", "Waves")).toBeNull();
  });

  it("returns no invented fallback for an uncovered topic", () => {
    expect(buildDeterministicLessonFallback("Physics", "quantum field theory")).toBeNull();
  });
});
