import { describe, expect, it } from "vitest";
import { checkCompleteness, validateLessonStructure } from "./validators";

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
    expect(checkCompleteness(value).coverage).toBe(100);
  });

  it("rejects a lesson without practice", () => {
    const value = lesson();
    (value.content.practice as unknown[]) = [];
    expect(validateLessonStructure(value).warnings.some((w) => w.field === "content.practice")).toBe(true);
    expect(checkCompleteness(value).isComplete).toBe(false);
  });

  it("rejects missing learning metadata", () => {
    const value = lesson();
    value.metadata = { difficulty: "intermediate" };
    expect(validateLessonStructure(value).isValid).toBe(false);
  });
});
