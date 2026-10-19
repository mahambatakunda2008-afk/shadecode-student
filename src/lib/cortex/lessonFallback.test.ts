import { describe, expect, it } from "vitest";
import { buildDeterministicLessonFallback } from "./lessonFallback";
import { lessonQualityFailures, type LessonQualityRequest } from "./lessonQuality";
import { resolveLessonRequest } from "./lessonRequest";

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

  it("accepts Waves fallback against the request shape resolved from the learner command", () => {
    const lesson = buildDeterministicLessonFallback("Physics (9702) AS Level", "Teach me Waves topic");
    expect(lesson).not.toBeNull();
    const request = resolveLessonRequest({
      prompt: "Teach me Waves topic",
      subject: "Physics (9702) AS Level",
      topic: "Teach me Waves topic",
    });
    expect(request.topic).toBe("Waves");
    expect(request.broadTopic).toBe(true);
    expect(lessonQualityFailures(lesson!, request).failures).toEqual([]);
  });

  it("normalizes command suffixes without altering ordinary curriculum topic labels", () => {
    const base = { prompt: "", subject: "Physics (9702) AS Level" };
    expect(resolveLessonRequest({ ...base, prompt: "Teach me Waves topic", topic: "Teach me Waves topic" }).topic).toBe("Waves");
    expect(resolveLessonRequest({ ...base, prompt: "Teach me Waves chapter", topic: "Teach me Waves chapter" }).topic).toBe("Waves");
    expect(resolveLessonRequest({ ...base, prompt: "Explain stationary waves", topic: "Stationary Waves" }).topic).toBe("Stationary Waves");
    expect(resolveLessonRequest({ ...base, prompt: "Teach me waves in a string", topic: "Teach me waves in a string" }).topic).toBe("waves in a string");
  });

  it("keeps the authored AS Physics Waves lesson available for deterministic recovery", () => {
    const lesson = buildDeterministicLessonFallback("Physics (9702) AS Level", "Teach me Waves topic");
    expect(lesson).not.toBeNull();
    expect(lesson!.title.toLowerCase()).toContain("waves");
    expect(lesson!.blocks.length).toBeGreaterThanOrEqual(10);
    expect(lesson!.blocks.some((block) => block.type === "example")).toBe(true);
    expect(lesson!.blocks.some((block) => block.type === "checkpoint")).toBe(true);

    // The persist endpoint enforces this minimum after filtering malformed or
    // empty blocks. Verify this fallback survives that exact contract.
    const persistableBlocks = lesson!.blocks.filter(
      (block) => typeof block.content === "string" && block.content.trim().length >= 40,
    ).slice(0, 28);
    expect(persistableBlocks.length).toBeGreaterThanOrEqual(10);
    expect(persistableBlocks.every((block) => typeof block.type === "string")).toBe(true);
  });

  it("returns null for a topic with no hand-authored fallback", () => {
    expect(buildDeterministicLessonFallback("Mathematics", "Quadratic equations")).toBeNull();
    expect(buildDeterministicLessonFallback("Biology", "Cell structure")).toBeNull();
  });
});
