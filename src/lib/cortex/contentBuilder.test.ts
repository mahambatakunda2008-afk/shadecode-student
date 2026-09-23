import { describe, expect, it } from "vitest";
import { buildLessonContent } from "./contentBuilder";
import { createExplanationTemplate } from "./templates";

const config = {
  template: createExplanationTemplate("Quadratic equations", "intermediate"),
  topic: "Quadratic equations",
  level: "intermediate" as const,
  includeExamples: true,
  includePractice: true,
};

describe("lesson content builder", () => {
  it("accepts structured JSON returned by a model", async () => {
    const result = await buildLessonContent(JSON.stringify({
      title: "Quadratic Equations",
      summary: "How quadratic equations work and how to solve them.",
      concepts: ["roots", "factorisation", "quadratic formula"],
      objectives: ["Solve quadratic equations", "Explain why methods work"],
      sections: Array.from({ length: 5 }, (_, i) => ({
        heading: ["Meaning", "Structure", "Factorisation", "Formula", "Exam strategy"][i],
        content: "Detailed teaching content for this section.",
      })),
      examples: [
        { title: "Example 1", description: "Solve x² - 5x + 6 = 0.", solution: "Factorise to (x-2)(x-3)=0." },
        { title: "Example 2", description: "Solve a quadratic with the formula.", solution: "Substitute the coefficients and simplify." },
      ],
      keyPoints: ["A quadratic has degree two.", "Roots make the equation zero."],
      practice: [
        { question: "Solve x²-1=0.", type: "short_answer", correctAnswer: "x=±1", explanation: "Difference of squares.", difficulty: "easy" },
        { question: "Solve x²-5x+6=0.", type: "short_answer", correctAnswer: "2,3", explanation: "Factorise.", difficulty: "medium" },
        { question: "Explain why roots are useful.", type: "short_answer", correctAnswer: "They identify x-values making the expression zero.", explanation: "Use the definition.", difficulty: "medium" },
      ],
      assessment: [
        { question: "Solve a quadratic.", type: "short_answer", correctAnswer: "Use a valid method.", maxPoints: 2, rubric: "Correct method and answer." },
      ],
      estimatedMinutes: 30,
    }), config);
    expect(result.success).toBe(true);
    expect(result.lesson?.content.explanation.length).toBeGreaterThanOrEqual(5);
    expect(result.lesson?.content.examples.length).toBeGreaterThanOrEqual(2);
    expect(result.lesson?.content.practice.length).toBeGreaterThanOrEqual(3);
    expect(result.lesson?.assessment?.length).toBeGreaterThanOrEqual(1);
  });

  it("normalizes markdown responses instead of silently returning an empty template", async () => {
    const markdown = `# Quadratic Equations
## Meaning
A quadratic equation has a highest power of two.
## Methods
Factorisation, completing the square, and the quadratic formula are common methods.
## Worked Examples
### Example 1
Solve x²-5x+6=0 by factorisation.
### Example 2
Solve a quadratic using the formula.
## Key Points
- Degree two
- Roots make the expression zero
## Practice
Q1: Solve x²-1=0.
A: x=±1
Q2: Explain what a root means.
A: It makes the expression zero.
Q3: Choose a suitable method for an unfamiliar quadratic.
A: Select a method based on its structure.
`;
    const result = await buildLessonContent(markdown, config);
    expect(result.success).toBe(true);
    expect(result.lesson?.content.explanation.length).toBeGreaterThan(0);
    expect(result.lesson?.content.examples.length).toBeGreaterThanOrEqual(2);
    expect(result.lesson?.content.practice.length).toBeGreaterThanOrEqual(3);
  });
});
