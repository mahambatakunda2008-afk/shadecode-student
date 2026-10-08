/**
 * src/lib/exam/engine/quiz.ts
 *
 * Multiple-choice quiz built from the deterministic engine, for the lesson quiz
 * when AI generation is unavailable. Distractors are common-error values
 * (halved, doubled, off by a power of ten, sign slips), never within the marking
 * tolerance of the right answer, and never duplicated in display.
 */

import type { NumericSpec } from "./numeric";
import { buildEngineExam, formatAnswer } from "./index";
import { latexToPlain } from "./plainText";
import { createRng, freshSeed, type Rng } from "./rng";

export interface EngineQuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const LETTERS = ["A", "B", "C", "D"] as const;

function candidates(spec: NumericSpec, allowNegative: boolean): number[] {
  const { exact } = spec;
  const integer = spec.tolerance <= 1e-6 && Number.isInteger(exact);
  const list = integer
    ? [exact + 1, exact - 1, exact + 2, exact - 2, exact * 2, Math.round(exact / 2), exact + 10, exact - 10, exact * 10]
    : [exact * 2, exact / 2, exact * 10, exact / 10, exact * 1.1, exact * 0.9, exact * 1.5, exact * 0.75];
  if (allowNegative) list.push(-exact);
  return list;
}

export function optionsFor(spec: NumericSpec, rng: Rng, allowNegative: boolean): { options: string[]; correctIndex: number } {
  const correct = formatAnswer(spec);
  const shown = new Set<string>([correct]);
  const wrong: string[] = [];

  for (const value of rng.shuffle(candidates(spec, allowNegative))) {
    if (!Number.isFinite(value) || (!allowNegative && value < 0)) continue;
    if (Math.abs(value - spec.exact) <= spec.tolerance * 1.01) continue;
    const text = formatAnswer({ ...spec, exact: value });
    if (shown.has(text)) continue;
    shown.add(text);
    wrong.push(text);
    if (wrong.length === 3) break;
  }

  // Extremely small or degenerate answers: pad with clearly different, distinct values.
  for (let step = 1; wrong.length < 3 && step < 50; step++) {
    const text = formatAnswer({ ...spec, exact: spec.exact + step * Math.max(spec.tolerance * 4, 1) });
    if (!shown.has(text)) { shown.add(text); wrong.push(text); }
  }

  const all = rng.shuffle([correct, ...wrong]);
  return { options: all.map((text, index) => `${LETTERS[index]}) ${text}`), correctIndex: all.indexOf(correct) };
}

export function buildEngineQuiz(options: { subject: string; topic: string; count?: number; seed?: number }): EngineQuizQuestion[] | null {
  const seed = options.seed ?? freshSeed();
  const count = Math.max(1, Math.min(options.count ?? 5, 10));
  const exam = buildEngineExam({ subject: options.subject, topic: options.topic, difficulty: "medium", count, seed });
  if (!exam) return null;

  const allowNegative = /math/i.test(options.subject);
  return exam.questions.map((question, index) => {
    const spec = question.numeric!;
    const { options: choices, correctIndex } = optionsFor(spec, createRng(seed + 31 * (index + 1)), allowNegative);
    const working = (question.modelAnswer ?? "").split("\n").slice(1).map(latexToPlain).filter(Boolean).join(" ");
    return {
      id: index + 1,
      question: latexToPlain(question.question),
      options: choices,
      correctIndex,
      explanation: `The answer is ${formatAnswer(spec)}. ${working}`.trim(),
    };
  });
}
