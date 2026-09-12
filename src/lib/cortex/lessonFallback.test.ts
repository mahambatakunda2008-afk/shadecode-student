import { describe, expect, it } from "vitest";
import { buildDeterministicLessonFallback } from "./lessonFallback";
import { lessonQualityFailures, type LessonQualityRequest } from "./lessonQuality";

// Each entry is the exact (subject, topic) pair a fallback should match, plus
// the "teach" request that generate/route.ts would build for a matching
// lesson. This is the whole point of the fallback existing: it's the last
// resort when every AI provider fails, so it must itself pass the same
// quality gate real AI output has to pass -- a fallback that fails the gate
// is worse than no fallback, since generateAndValidate would report the
// generic "could not produce a lesson" error either way, silently hiding
// that a hand-authored lesson was sitting right there unused.
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

  it("returns null for a topic with no hand-authored fallback", () => {
    expect(buildDeterministicLessonFallback("Mathematics", "Quadratic equations")).toBeNull();
    expect(buildDeterministicLessonFallback("Biology", "Cell structure")).toBeNull();
  });
});
