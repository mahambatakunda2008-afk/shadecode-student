import { describe, expect, it } from "vitest";
import { buildDeterministicLessonFallback } from "./lessonFallback";
import { lessonQualityFailures, type LessonQualityRequest } from "./lessonQuality";

// Each entry is an exact subject/topic pair that the provider-free recovery
// path must serve. Every curated lesson must pass the same quality gate as
// generated content, otherwise recovery silently fails when the provider chain
// is exhausted.
const CASES: { subject: string; topic: string }[] = [
  { subject: "Mathematics", topic: "Trigonometric identities" },
  { subject: "Computer Science", topic: "Binary number systems" },
  { subject: "Physics", topic: "Newton's laws of motion" },
  { subject: "Physics", topic: "Waves" },
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

  it("returns null for a topic with no hand-authored fallback", () => {
    expect(buildDeterministicLessonFallback("Mathematics", "Quadratic equations")).toBeNull();
    expect(buildDeterministicLessonFallback("Biology", "Cell structure")).toBeNull();
  });
});
