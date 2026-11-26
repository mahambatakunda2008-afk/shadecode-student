import { describe, expect, it } from "vitest";
import { checkCompleteness, validateLessonStructure } from "./validators";
import type { StructuredLesson } from "./templates";
import { lessonQualityFailures } from "./lessonQuality";

function lesson(overrides: Record<string, unknown> = {}) {
  return {
    title: "Kinematics",
    topic: "Kinematics",
    content: {
      explanation: [
        { heading: "Definitions", content: "Displacement is the vector change in position." },
        { heading: "Principles", content: "Velocity is the rate of change of displacement." },
        { heading: "Relationships", content: "For constant acceleration, v = u + at." },
      ],
      examples: [{ title: "Example", description: "A worked example.", solution: "Substitute values." }],
      keyPoints: ["Use consistent units", "Choose the correct equation"],
      practice: [{ question: "Calculate the final velocity.", type: "short_answer", correctAnswer: "10", explanation: "Using v = u + at." }],
    },
    assessment: [{ question: "What is velocity?" }],
    metadata: { difficulty: "intermediate", estimatedTime: 30, concepts: ["velocity"], objectives: ["calculate velocity"] },
    ...overrides,
  };
}

describe("Learn quality gate", () => {
  it("accepts a complete structured lesson", () => {
    const value = lesson();
    expect(validateLessonStructure(value).isValid).toBe(true);
    expect(checkCompleteness(value as unknown as StructuredLesson).coverage).toBe(100);
  });

  it("rejects a lesson without practice", () => {
    const value = lesson();
    (value.content.practice as unknown[]) = [];
    expect(validateLessonStructure(value).warnings.some((w) => w.field === "content.practice")).toBe(true);
    expect(checkCompleteness(value as unknown as StructuredLesson).isComplete).toBe(false);
  });

  it("rejects missing learning metadata", () => {
    const value = lesson();
    (value.metadata as unknown) = { difficulty: "intermediate" };
    expect(validateLessonStructure(value).isValid).toBe(false);
  });
});

describe("generated lesson title normalization", () => {
  it("replaces empty and generic shell titles with the requested topic", async () => {
    const { normalizeGeneratedLessonTitle } = await import("./lessonQuality");
    expect(normalizeGeneratedLessonTitle("", "Kinematics")).toBe("Kinematics: Core concepts and practice");
    expect(normalizeGeneratedLessonTitle("Overview", "Kinematics")).toBe("Kinematics: Core concepts and practice");
    expect(normalizeGeneratedLessonTitle("New lesson", "Waves")).toBe("Waves: Core concepts and practice");
  });

  it("replaces the internal generation shell title without exposing it", async () => {
    const { normalizeGeneratedLessonTitle } = await import("./lessonQuality");
    expect(normalizeGeneratedLessonTitle("Cortex is building Kinematics", "Physics")).toBe("Kinematics: Core concepts and practice");
  });

  it("preserves meaningful generated titles and enforces the database length limit", async () => {
    const { normalizeGeneratedLessonTitle } = await import("./lessonQuality");
    expect(normalizeGeneratedLessonTitle("Kinematics: Motion and acceleration", "Physics")).toBe("Kinematics: Motion and acceleration");
    expect(normalizeGeneratedLessonTitle("x".repeat(300), "Physics")).toHaveLength(255);
  });
});

describe("generated lesson completeness checks", () => {
  const request = {
    intent: "teach" as const,
    subject: "Mathematics",
    topic: "Integration",
    prompt: "Teach integration",
    requestedParts: [],
  };

  it("rejects numbered practice questions without matching answer guidance", () => {
    const failures = lessonQualityFailures({
      title: "Integration",
      blocks: [
        { type: "practice", content: "1. Evaluate the integral of x squared?\\n2. Find the constant of integration?" },
      ],
    }, request);
    expect(failures.failures).toContain("practice-answer-guidance-incomplete");
  });

  it("accepts numbered practice questions with corresponding answers", () => {
    const failures = lessonQualityFailures({
      title: "Integration",
      blocks: [
        { type: "practice", content: "1. Evaluate the integral of x squared?\\nAnswer: x cubed over 3 plus C.\\n2. Find the constant of integration?\\nGuidance: Use the initial condition to determine C." },
      ],
    }, request);
    expect(failures.failures).not.toContain("practice-answer-guidance-incomplete");
  });

  it("rejects an empty Answers heading as missing practice guidance", () => {
    const failures = lessonQualityFailures({
      title: "Integration",
      blocks: [
        { type: "practice", content: "1. Evaluate the integral of x squared.\n2. Find the constant of integration.\n\nAnswers:" },
      ],
    }, request);
    expect(failures.failures).toContain("practice-answer-guidance-incomplete");
  });

  it("accepts a substantive answer section for practice questions", () => {
    const failures = lessonQualityFailures({
      title: "Integration",
      blocks: [
        { type: "practice", content: "1. Evaluate the integral of x squared.\n2. Find the constant of integration.\n\nAnswers:\n1. Integrate using the power rule to obtain x cubed over 3 plus C.\n2. Substitute the initial condition and solve for C." },
      ],
    }, request);
    expect(failures.failures).not.toContain("practice-answer-guidance-incomplete");
  });

  it("recognizes capitalized Question and Task labels in exam blocks", () => {
    const failures = lessonQualityFailures({
      title: "Integration",
      blocks: [{ type: "exam", content: "Question: Evaluate the integral of 2x.\nTask: Show your working." }],
    }, request);
    expect(failures.failures).not.toContain("exam-transfer-without-question");
  });

  it("rejects an exam block that contains no actual question or task", () => {
    const failures = lessonQualityFailures({
      title: "Integration",
      blocks: [{ type: "exam", content: "Use clear working and check your answer." }],
    }, request);
    expect(failures.failures).toContain("exam-transfer-without-question");
  });
});

