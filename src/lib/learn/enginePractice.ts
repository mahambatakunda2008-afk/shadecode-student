/**
 * src/lib/learn/enginePractice.ts
 *
 * Stateless, model-free practice for a matched syllabus topic. The server
 * rebuilds the question from (subject, topic, generator, seed), so the browser
 * never holds the answer and no storage is needed. Which question type is shown
 * can be steered by weights learned from the learner's own history.
 */

import { buildQuestion, formatAnswer, generatorById, matchGenerators, weightedOrder } from "@/lib/exam/engine";
import { markNumeric } from "@/lib/exam/engine/numeric";
import { latexToPlain } from "@/lib/exam/engine/plainText";
import { createRng } from "@/lib/exam/engine/rng";

export interface PracticeQuestion {
  seed: number;
  generator: string;
  question: string;
  marks: number;
}

export interface PracticeCheck {
  correct: boolean;
  answer: string;
  working: string;
  generator: string;
  /** A kind hint when the wrong answer matches a classic mistake. */
  hint?: string;
  mistakeId?: string;
}

const validSeed = (seed: unknown): seed is number => typeof seed === "number" && Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff;

export function newPracticeQuestion(subject: string, topicTitle: string, seed: number, weights?: Record<string, number>): PracticeQuestion | null {
  if (!validSeed(seed)) return null;
  const matched = matchGenerators(subject, topicTitle);
  if (!matched.length) return null;
  const order = weights ? weightedOrder(matched, weights, createRng(seed)) : createRng(seed).shuffle(matched);
  const generator = order[0];
  const { question } = buildQuestion(generator, seed, "practice");
  return { seed, generator: generator.id, question: latexToPlain(question.question), marks: question.marks };
}

export function checkPracticeAnswer(subject: string, topicTitle: string, seed: unknown, generatorId: unknown, answer: string): PracticeCheck | null {
  if (!validSeed(seed) || typeof generatorId !== "string") return null;
  const generator = generatorById(subject, topicTitle, generatorId);
  if (!generator) return null;
  const { question } = buildQuestion(generator, seed, "practice");
  if (!question.numeric) return null;

  const marked = markNumeric(answer.slice(0, 500), question.numeric);
  const working = (question.modelAnswer ?? "").split("\n").slice(1).map(latexToPlain).filter(Boolean).join(" ");
  return {
    correct: marked.correct,
    answer: formatAnswer(question.numeric),
    working,
    generator: generator.id,
    ...(marked.mistake ? { hint: marked.mistake.hint, mistakeId: marked.mistake.id } : {}),
  };
}
