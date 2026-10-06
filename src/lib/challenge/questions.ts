/**
 * src/lib/challenge/questions.ts
 *
 * Validates and bounds an exam question set before it is stored or served for
 * a battle. Unknown fields are dropped and every string is length-capped, so a
 * tampered client cannot persist arbitrary payloads.
 */

import type { ExamQuestion } from "@/lib/exam/types";

const TYPES = new Set(["multiple_choice", "short_answer", "structured", "essay"]);
const MAX_QUESTIONS = 20;

const text = (value: unknown, max: number): string | null =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

export function sanitizeQuestions(input: unknown): ExamQuestion[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_QUESTIONS) return null;

  const cleaned: ExamQuestion[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;

    const question = text(item.question, 4000);
    const type = typeof item.type === "string" && TYPES.has(item.type) ? (item.type as ExamQuestion["type"]) : null;
    const id = typeof item.id === "number" && Number.isInteger(item.id) && item.id > 0 && item.id <= 1000 ? item.id : null;
    const marks = typeof item.marks === "number" && Number.isFinite(item.marks) && item.marks >= 1 && item.marks <= 50 ? item.marks : null;
    if (!question || !type || id === null || marks === null) return null;

    const options = Array.isArray(item.options)
      ? item.options.map((option) => text(option, 500)).filter((option): option is string => option !== null).slice(0, 8)
      : undefined;
    if (type === "multiple_choice" && (!options || options.length < 2)) return null;

    cleaned.push({
      id,
      type,
      question,
      marks,
      topic: text(item.topic, 160) ?? "General",
      ...(options?.length ? { options } : {}),
      ...(text(item.modelAnswer, 4000) ? { modelAnswer: text(item.modelAnswer, 4000)! } : {}),
      ...(text(item.markingCriteria, 2000) ? { markingCriteria: text(item.markingCriteria, 2000)! } : {}),
    });
  }

  return new Set(cleaned.map((question) => question.id)).size === cleaned.length ? cleaned : null;
}
