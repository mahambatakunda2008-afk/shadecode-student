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

  it("provides a verified substitution lesson for an exact Mathematics topic", () => {
    const lesson = buildDeterministicLessonFallback("Maths AS Level 9709", "Integration by substitution");
    expect(lesson?.title).toContain("Integration by substitution");
    expect(lesson?.blocks.length).toBeGreaterThanOrEqual(10);
    expect(lesson?.blocks.some((block) => block.type === "example")).toBe(true);
  });

  it("provides a verified integration-by-parts lesson for an exact Mathematics topic", () => {
    const lesson = buildDeterministicLessonFallback("Mathematics", "Integration by parts");
    expect(lesson?.title).toContain("Integration by parts");
    expect(lesson?.blocks.length).toBeGreaterThanOrEqual(10);
    expect(lesson?.blocks.some((block) => block.type === "example")).toBe(true);
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


  it("serves the book-informed Physics kinematics pilot when offline fallback is needed", () => {
    const lesson = buildDeterministicLessonFallback(
      "Cambridge International AS Level Physics (9702)",
      "Teach me kinematics",
    );

    expect(lesson?.title).toContain("Kinematics");
    expect(lesson?.blocks.length).toBeGreaterThanOrEqual(10);
    expect(lesson?.blocks.some((block) => block.type === "example")).toBe(true);
    expect(lesson?.blocks.some((block) => block.type === "practice")).toBe(true);
    expect(buildDeterministicLessonFallback("Mathematics", "Kinematics")).toBeNull();
  });

  it("serves the original accelerated-motion lesson offline and keeps it Physics-only", () => {
    const lesson = buildDeterministicLessonFallback(
      "Cambridge International AS Level Physics (9702)",
      "Teach me accelerated motion",
    );

    expect(lesson?.title).toContain("Accelerated motion");
    expect(lesson?.blocks.length).toBeGreaterThanOrEqual(10);
    expect(lesson?.blocks.some((block) => block.type === "example")).toBe(true);
    expect(lesson?.blocks.some((block) => block.type === "practice")).toBe(true);
    expect(lesson?.blocks.some((block) => block.content.includes("stopping displacement"))).toBe(true);
    expect(buildDeterministicLessonFallback("Mathematics", "Accelerated motion")).toBeNull();
  });

  it("serves the book-informed Pure Mathematics algebra pilot without leaking it to other subjects", () => {
    const lesson = buildDeterministicLessonFallback(
      "Pure Mathematics (9709)",
      "Algebra",
    );

    expect(lesson?.title).toContain("Algebra");
    expect(lesson?.blocks.length).toBeGreaterThanOrEqual(10);
    expect(lesson?.blocks.some((block) => block.type === "example")).toBe(true);
    expect(lesson?.blocks.some((block) => block.type === "practice")).toBe(true);
    expect(buildDeterministicLessonFallback("Physics (9702)", "Algebra")).toBeNull();
  });

  it("serves the original Pure Mathematics logarithms lesson offline without leaking it to other subjects", () => {
    const lesson = buildDeterministicLessonFallback(
      "Pure Mathematics (9709)",
      "Teach me logarithms and exponential functions",
    );

    expect(lesson?.title).toContain("Logarithms and exponential functions");
    expect(lesson?.blocks.length).toBeGreaterThanOrEqual(14);
    expect(lesson?.blocks.some((block) => block.type === "example")).toBe(true);
    expect(lesson?.blocks.some((block) => block.type === "diagram")).toBe(true);
    expect(lesson?.blocks.some((block) => block.type === "practice")).toBe(true);
    expect(buildDeterministicLessonFallback("Physics (9702)", "Logarithms and exponential functions")).toBeNull();
  });

});