import { describe, expect, it } from "vitest";
import { lessonQualityFailures, normalizeGeneratedLessonTitle } from "./lessonQuality";

const request = {
  intent: "teach" as const,
  subject: "Mathematics",
  topic: "Integration",
  prompt: "Integration",
  requestedParts: [],
  difficulty: "easy" as const,
  depth: "standard" as const,
};

function lesson(practice: string, exam: string) {
  return {
    title: "Integration: understand and apply the core methods",
    blocks: [
      { type: "objective", title: "Learning objective", content: "By the end, explain and apply integration." },
      { type: "concept", title: "What integration means", content: "Integration is accumulation and the reverse operation of differentiation." },
      { type: "example", title: "Worked example", content: "Given: integrate 2x. Method: use the reverse power rule. Answer: x squared plus C." },
      { type: "checkpoint", title: "Check", content: "Question: What happens to the power when you integrate x squared? Think: reverse differentiation." },
      { type: "practice", title: "Practice", content: practice },
      { type: "exam", title: "Exam transfer", content: exam },
      { type: "mistake", title: "Common mistake", content: "Do not forget the constant of integration for an indefinite integral." },
      { type: "summary", title: "Summary", content: "Integration reverses differentiation and accumulates quantities." },
    ],
  };
}

describe("lesson title normalization", () => {
  it("replaces internal generation placeholders with a stable topic title", () => {
    expect(normalizeGeneratedLessonTitle("Cortex is building Integration", "Integration"))
      .toBe("Integration: Core concepts and practice");
  });

  it("preserves a meaningful generated title", () => {
    expect(normalizeGeneratedLessonTitle("Mastering Integration: Applications and Practice", "Integration"))
      .toBe("Mastering Integration: Applications and Practice");
  });
});

describe("lesson quality: usable assessment content", () => {
  it("rejects unbalanced or nested LaTeX delimiters in mathematical examples", () => {
    const draft = lesson(
      "Practice Question 1: Integrate 2x. Answer Guidance 1: x squared plus C. Practice Question 2: Integrate 3x squared. Answer Guidance 2: x cubed plus C.",
      "Question: Evaluate the integral from 0 to 2 of 3x squared.",
    );
    draft.blocks.push({
      type: "example",
      title: "Malformed unit expression",
      content: String.raw`Given: velocity is $-2.0\\text{ $\\frac{m}{s}$}.`,
    });

    const result = lessonQualityFailures(draft, request);
    expect(result.failures).toContain("math-delimiters-unbalanced");
  });

  it("rejects a practice set with missing answer guidance for a numbered question", () => {
    const result = lessonQualityFailures(lesson(
      "Practice Question 1: Integrate 2x. Answer Guidance 1: x squared plus C. Practice Question 2: Integrate 3x squared. Answer Guidance 2: x cubed plus C. Practice Question 3: Integrate 4x.",
      "Question: Evaluate the integral from 0 to 2 of 3x squared. Approach: Find the antiderivative and apply the limits.",
    ), request);

    expect(result.failures).toContain("practice-answer-guidance-incomplete");
  });

  it("catches a missing answer explanation when guidance is written inline", () => {
    const result = lessonQualityFailures(lesson(
      "Practice Question 1: Integrate 2x. Answer guidance: x squared plus C. Practice Question 2: Integrate 3x squared. Answer guidance: x cubed plus C. Practice Question 3: Integrate 4x.",
      "Question: Evaluate the integral from 0 to 2 of 3x squared. Approach: Find the antiderivative and apply the limits.",
    ), request);

    expect(result.failures).toContain("practice-answer-guidance-incomplete");
  });

  it("rejects generic exam advice that contains no actual task", () => {
    const result = lessonQualityFailures(lesson(
      "Practice Question 1: Integrate 2x. Answer Guidance 1: x squared plus C. Practice Question 2: Integrate 3x squared. Answer Guidance 2: x cubed plus C.",
      "When answering integration questions, show each step and check the limits carefully.",
    ), request);

    expect(result.failures).toContain("exam-transfer-no-task");
  });

  it("accepts numbered practice questions with matching guidance and a real exam task", () => {
    const result = lessonQualityFailures(lesson(
      "Practice Question 1: Integrate 2x. Answer Guidance 1: x squared plus C. Practice Question 2: Integrate 3x squared. Answer Guidance 2: x cubed plus C. Practice Question 3: Integrate 4x. Answer Guidance 3: 2x squared plus C.",
      "Question: Evaluate the integral from 0 to 2 of 3x squared. Approach: Find the antiderivative and apply the limits.",
    ), request);

    expect(result.failures).not.toContain("practice-answer-guidance-incomplete");
    expect(result.failures).not.toContain("exam-transfer-no-task");
  });
});
