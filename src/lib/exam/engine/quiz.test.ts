import { describe, expect, it } from "vitest";
import { ALL_GENERATORS } from "./index";
import { markNumeric } from "./numeric";
import { latexToPlain } from "./plainText";
import { buildEngineQuiz } from "./quiz";
import { buildEngineExam } from "./index";
import { createRng } from "./rng";

describe("latexToPlain", () => {
  it("converts common constructs", () => {
    expect(latexToPlain("Solve $x^2 + 2x - 3 = 0$.")).toBe("Solve x² + 2x - 3 = 0.");
    expect(latexToPlain("$\\frac{3}{4}$")).toBe("3/4");
    expect(latexToPlain("Evaluate $\\log_{10} 1000$.")).toBe("Evaluate log₁₀ 1000.");
    expect(latexToPlain("$\\binom{8}{3}$")).toBe("C(8, 3)");
    expect(latexToPlain("$\\int_0^{3} \\left(3x^2 + 4x + 1\\right)\\,dx$")).toBe("∫ from 0 to 3 of (3x² + 4x + 1) dx");
  });
  it("leaves no LaTeX residue for any maths generator question or working line", () => {
    for (const generator of ALL_GENERATORS.filter((g) => g.subject === "Mathematics")) {
      for (let seed = 1; seed <= 120; seed++) {
        const item = generator.build(createRng(seed * 977));
        for (const text of [item.question, ...item.working]) {
          const plain = latexToPlain(text);
          expect(plain, `${generator.id}: ${text}`).not.toMatch(/[\\${}]/);
        }
      }
    }
  });
});

describe("buildEngineQuiz", () => {
  it("builds five valid, plain-text multiple-choice questions", () => {
    const quiz = buildEngineQuiz({ subject: "Physics", topic: "Introduction to Kinematics", seed: 5 })!;
    expect(quiz).toHaveLength(5);
    for (const q of quiz) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThanOrEqual(3);
      expect(q.question).not.toMatch(/[\\$]/);
      expect(q.explanation.length).toBeGreaterThan(10);
    }
  });

  it("marks exactly one option right across many seeds and subjects", () => {
    for (const [subject, topic] of [["Physics", ""], ["Mathematics", ""], ["Chemistry", ""], ["Computer Science", ""]] as const) {
      for (let seed = 1; seed <= 60; seed++) {
        const quiz = buildEngineQuiz({ subject, topic, count: 5, seed: seed * 7919 })!;
        const exam = buildEngineExam({ subject, topic, difficulty: "medium", count: 5, seed: seed * 7919 })!;
        quiz.forEach((q, i) => {
          const spec = exam.questions[i].numeric!;
          const verdicts = q.options.map((option) => markNumeric(option.replace(/^[A-D]\)\s*/, ""), spec).correct);
          expect(verdicts.filter(Boolean), `${subject} seed ${seed} q${i + 1}: ${q.options.join(" | ")}`).toHaveLength(1);
          expect(verdicts[q.correctIndex]).toBe(true);
        });
      }
    }
  });

  it("is deterministic and refuses uncovered topics", () => {
    expect(buildEngineQuiz({ subject: "Chemistry", topic: "moles", seed: 9 })).toEqual(buildEngineQuiz({ subject: "Chemistry", topic: "moles", seed: 9 }));
    expect(buildEngineQuiz({ subject: "Physics", topic: "Magnetism" })).toBeNull();
    expect(buildEngineQuiz({ subject: "Biology", topic: "Cells" })).toBeNull();
  });
});
