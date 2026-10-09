/**
 * src/lib/challenge/serverMarking.ts
 *
 * Splits a deterministic paper into a keyless play set (what players see) and a
 * private answer key (what only the server holds), and marks submissions
 * against the key. Because the key never reaches a browser, a battle score
 * cannot be forged.
 *
 * Only papers whose every question is marked exactly (numeric or multiple
 * choice) qualify; anything needing a model or a human stays self-reported.
 */

import type { ExamAnswer, ExamQuestion, ExamResults } from "@/lib/exam/types";
import { markExamOffline } from "@/lib/local-first/exam-marker";
import type { NumericSpec } from "@/lib/exam/engine/numeric";

export interface KeyEntry {
  id: number;
  numeric?: NumericSpec;
  modelAnswer?: string;
  markingCriteria?: string;
}

export function isDeterministicPaper(questions: ExamQuestion[]): boolean {
  return questions.length > 0 && questions.every((question) => Boolean(question.numeric) || (question.type === "multiple_choice" && Boolean(question.modelAnswer)));
}

/** Play set without any answer material, plus the key to keep private. */
export function splitPaper(questions: ExamQuestion[]): { playSet: ExamQuestion[]; key: KeyEntry[] } {
  const key: KeyEntry[] = questions.map((question) => ({
    id: question.id,
    ...(question.numeric ? { numeric: question.numeric } : {}),
    ...(question.modelAnswer ? { modelAnswer: question.modelAnswer } : {}),
    ...(question.markingCriteria ? { markingCriteria: question.markingCriteria } : {}),
  }));
  const playSet = questions.map((question) => {
    const { modelAnswer: _modelAnswer, markingCriteria: _markingCriteria, numeric: _numeric, ...visible } = question;
    void _modelAnswer; void _markingCriteria; void _numeric;
    return visible as ExamQuestion;
  });
  return { playSet, key };
}

/** Marks a submission against the private key. Unanswered or unknown ids score zero. */
export function markAgainstKey(playSet: ExamQuestion[], key: KeyEntry[], answers: ExamAnswer[], timeTaken: number): ExamResults | null {
  const keyById = new Map(key.map((entry) => [entry.id, entry]));
  const full = playSet.map((question) => ({ ...question, ...keyById.get(question.id) })) as ExamQuestion[];
  if (!isDeterministicPaper(full)) return null;

  const valid = new Set(playSet.map((question) => question.id));
  const cleaned = answers
    .filter((answer) => valid.has(answer.questionId))
    .map((answer) => ({ questionId: answer.questionId, answer: String(answer.answer ?? "").slice(0, 2000), timeSpent: Math.max(0, Math.min(Number(answer.timeSpent) || 0, 86_400)) }));

  return { ...markExamOffline(full, cleaned, Math.max(0, Math.round(timeTaken) || 0)), source: "server" };
}
