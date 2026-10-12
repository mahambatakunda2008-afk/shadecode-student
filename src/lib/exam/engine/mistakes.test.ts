import { describe, expect, it } from "vitest";
import { ALL_GENERATORS, buildEngineExam, formatAnswer } from "./index";
import { MISTAKES, mistakesFor } from "./mistakes";
import { markNumeric } from "./numeric";
import { createRng } from "./rng";
import { markExamOffline } from "@/lib/local-first/exam-marker";
import { buildEngineQuiz } from "./quiz";
import type { ExamAnswer, ExamQuestion } from "@/lib/exam/types";

const SEEDS = Array.from({ length: 250 }, (_, i) => i * 1299709 + 5);
type P = Record<string, number | string>;

describe("mistake library", () => {
  it("covers every generator", () => {
    for (const generator of ALL_GENERATORS) expect(MISTAKES[generator.id], `no mistakes for ${generator.id}`).toBeTypeOf("function");
    expect(Object.keys(MISTAKES).sort()).toEqual(ALL_GENERATORS.map((g) => g.id).sort());
  });

  for (const generator of ALL_GENERATORS) {
    it(`${generator.id}: every mistake is a distinct, diagnosable wrong answer with a kind hint`, () => {
      let withMistakes = 0;
      for (const seed of SEEDS) {
        const item = generator.build(createRng(seed));
        const mistakes = mistakesFor(generator.id, item.params as P, item.numeric.exact, item.numeric.tolerance);
        if (mistakes.length) withMistakes += 1;
        const ids = new Set<string>();
        for (const mistake of mistakes) {
          expect(Number.isFinite(mistake.value)).toBe(true);
          expect(mistake.hint.length).toBeGreaterThan(12);
          expect(mistake.hint).not.toMatch(/NaN|undefined/);
          ids.add(mistake.id);
          // A mistake must never be marked as the right answer, and must be recognised when typed.
          const spec = { ...item.numeric, mistakes };
          expect(markNumeric(String(mistake.value), spec).correct, `${generator.id} treats mistake ${mistake.id} as correct`).toBe(false);
          const typed = Number.isInteger(mistake.value) ? String(mistake.value) : String(Number(mistake.value.toPrecision(5)));
          expect(markNumeric(typed, spec).mistake?.id, `${generator.id} did not diagnose ${mistake.id} (typed ${typed})`).toBe(mistake.id);
        }
        expect(ids.size).toBe(mistakes.length);
        expect(mistakes.length).toBeLessThanOrEqual(4);
      }
      expect(withMistakes, `${generator.id} rarely produces a usable mistake`).toBeGreaterThan(SEEDS.length * 0.6);
    });
  }

  it("matches hand-derived mistakes for well-known slips", () => {
    const m = (id: string, p: P, exact: number) => Object.fromEntries(mistakesFor(id, p, exact, 1e-6).map((x) => [x.id, x.value]));
    expect(m("physics.suvat-v", { u: 5, a: 2, t: 4 }, 13)["forgot-initial-speed"]).toBe(8);
    expect(m("physics.kinetic-energy", { m: 4, v: 3 }, 18)["forgot-half"]).toBe(36);
    expect(m("physics.parallel-resistors", { r1: 6, r2: 3 }, 2)["added-as-series"]).toBe(9);
    expect(m("maths.mean", { data: "2,4,6" }, 4)["forgot-to-divide"]).toBe(12);
    expect(m("cs.hex-to-denary", { hex: "A5", value: 165 }, 165)["read-as-decimal"]).toBe(10 * 10 + 5);
    expect(m("cs.binary-to-denary", { bits: "00001101", value: 13 }, 13)["reversed-bits"]).toBe(176);
    expect(m("maths.discriminant", { a: 2, b: 3, c: 1 }, 1)["forgot-4"]).toBe(7);
  });
});

describe("diagnosis end to end", () => {
  const exam = buildEngineExam({ subject: "Physics", topic: "Kinematics", difficulty: "medium", count: 6, seed: 2024 })!;
  const questions = exam.questions.map((q, i) => ({ ...q, id: i + 1 })) as unknown as ExamQuestion[];

  it("gives targeted feedback and records the mistake id", () => {
    const index = questions.findIndex((q) => q.numeric?.mistakes?.length);
    expect(index).toBeGreaterThanOrEqual(0);
    const mistake = questions[index].numeric!.mistakes![0];
    const answers: ExamAnswer[] = [{ questionId: questions[index].id, answer: String(mistake.value), timeSpent: 5 }];
    const result = markExamOffline(questions, answers, 30).results.find((r) => r.questionId === questions[index].id)!;
    expect(result.correct).toBe(false);
    expect(result.feedback).toContain(mistake.hint);
    expect(result.mistakeId).toBe(mistake.id);
  });

  it("keeps generic feedback for unrelated wrong answers and no mistake id for correct ones", () => {
    const q = questions[0];
    const wrong = markExamOffline(questions, [{ questionId: q.id, answer: "987654.321", timeSpent: 1 }], 10).results.find((r) => r.questionId === q.id)!;
    expect(wrong.feedback).toContain("Check your working");
    expect(wrong.mistakeId).toBeUndefined();
    const right = markExamOffline(questions, [{ questionId: q.id, answer: formatAnswer(q.numeric!), timeSpent: 1 }], 10).results.find((r) => r.questionId === q.id)!;
    expect(right.correct).toBe(true);
    expect(right.mistakeId).toBeUndefined();
  });

  it("tags each question with its generator so outcomes can be learned per question type", () => {
    expect(exam.questions.every((q) => q.numeric?.generator?.startsWith("physics."))).toBe(true);
  });
});

describe("quiz distractors learn from the mistake library", () => {
  it("uses real mistakes as wrong options whenever a question has them", () => {
    let total = 0;
    let used = 0;
    for (const subject of ["Physics", "Mathematics", "Chemistry", "Computer Science"]) {
      for (let seed = 1; seed <= 40; seed++) {
        const s = seed * 7919;
        const quiz = buildEngineQuiz({ subject, topic: "", count: 5, seed: s })!;
        const exam = buildEngineExam({ subject, topic: "", difficulty: "medium", count: 5, seed: s })!;
        quiz.forEach((q, i) => {
          const spec = exam.questions[i].numeric!;
          if (!spec.mistakes?.length) return;
          total += 1;
          const shownValues = q.options.map((option) => option.replace(/^[A-D]\)\s*/, ""));
          if (spec.mistakes.some((mistake) => shownValues.includes(formatAnswer({ ...spec, exact: mistake.value })))) used += 1;
        });
      }
    }
    expect(total).toBeGreaterThan(300);
    expect(used / total).toBeGreaterThan(0.95);
  });
});
