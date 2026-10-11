/**
 * src/lib/learn/enginePractice.ts
 *
 * Stateless, model-free practice for a matched syllabus topic. The server
 * rebuilds the question from (subject, topic, seed), so the browser never holds
 * the answer and no storage is needed.
 */

import { buildEngineExam, formatAnswer } from "@/lib/exam/engine";
import { markNumeric } from "@/lib/exam/engine/numeric";
import { latexToPlain } from "@/lib/exam/engine/plainText";

export interface PracticeQuestion {
  seed: number;
  question: string;
  marks: number;
}

export interface PracticeCheck {
  correct: boolean;
  answer: string;
  working: string;
}

function build(subject: string, topicTitle: string, seed: number) {
  const exam = buildEngineExam({ subject, topic: topicTitle, difficulty: "medium", count: 1, seed });
  return exam?.questions[0] ?? null;
}

const validSeed = (seed: unknown): seed is number => typeof seed === "number" && Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff;

export function newPracticeQuestion(subject: string, topicTitle: string, seed: number): PracticeQuestion | null {
  if (!validSeed(seed)) return null;
  const question = build(subject, topicTitle, seed);
  return question ? { seed, question: latexToPlain(question.question), marks: question.marks } : null;
}

export function checkPracticeAnswer(subject: string, topicTitle: string, seed: unknown, answer: string): PracticeCheck | null {
  if (!validSeed(seed)) return null;
  const question = build(subject, topicTitle, seed);
  if (!question?.numeric) return null;
  const working = (question.modelAnswer ?? "").split("\n").slice(1).map(latexToPlain).filter(Boolean).join(" ");
  return { correct: markNumeric(answer.slice(0, 500), question.numeric).correct, answer: formatAnswer(question.numeric), working };
}
