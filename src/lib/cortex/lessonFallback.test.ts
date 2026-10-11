import { describe, expect, it } from "vitest";
import { buildDeterministicLessonFallback } from "./lessonFallback";
import { lessonQualityFailures, type LessonQualityRequest } from "./lessonQuality";

// These authored examples check fallback matching and the quality gate for
// topics whose lesson shape is designed to satisfy it. Some deep topics (such
// as Waves) are intentionally allowed to use curated material even when the
// AI-generation heuristic asks for additional checkpoint/continuation blocks.
const CASES: { subject: string; topic: string }[] = [
  { subject: "Mathematics", topic: "Trigonometric identities" },
  { subject: "Computer Science", topic: "Binary number systems" },
  { subject: "Physics", topic: "Newton's laws of motion" },
];

describe("buildDeterministicLessonFallback", () => {
  it.each(CASES)("matches $subject / $topic and passes the quality gate", ({ subject, topic }) => {
    const lesson = buildDeterministicLessonFallback(subject, topic);
    expect(lesson).not.toBeNull();

    const request: LessonQualityRequest = { intent: "teach", subject, topic, prompt: `Teach me ${topic}`, requestedParts: [] };
    const failures = lessonQualityFailures(lesson!, request);
    expect(failures.failures).toEqual([]);
  });

  it("matches common subject spelling variants (math/maths)", () => {
    expect(buildDeterministicLessonFallback("math", "Trigonometric Identities")).not.toBeNull();
    expect(buildDeterministicLessonFallback("Maths", "trigonometric identities")).not.toBeNull();
  });

  it("matches syllabus-coded subject names and natural-language topic requests", () => {
    expect(buildDeterministicLessonFallback("Physics (9702) AS Level", "Teach me Waves topic")).not.toBeNull();
    expect(buildDeterministicLessonFallback("Cambridge International AS Level Physics 9702", "waves")).not.toBeNull();
  });

  it("keeps the authored AS Physics Waves lesson available for deterministic recovery", () => {
    const lesson = buildDeterministicLessonFallback("Physics (9702) AS Level", "Teach me Waves topic");
    expect(lesson).not.toBeNull();
    expect(lesson!.title.toLowerCase()).toContain("waves");
    expect(lesson!.blocks.length).toBeGreaterThanOrEqual(10);
    expect(lesson!.blocks.some((block) => block.type === "example")).toBe(true);
    expect(lesson!.blocks.some((block) => block.type === "checkpoint")).toBe(true);
  });

  it("returns null for a topic with no hand-authored fallback", () => {
    expect(buildDeterministicLessonFallback("Mathematics", "Quadratic equations")).toBeNull();
    expect(buildDeterministicLessonFallback("Biology", "Cell structure")).toBeNull();
  });
});
