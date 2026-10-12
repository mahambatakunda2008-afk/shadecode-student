/**
 * src/lib/learning/signals.ts
 *
 * Validation and shaping for learning signals. Every client-supplied field is
 * bounded, so the table can only ever hold small, well-formed rows.
 */

import type { ExamQuestion, ExamResult } from "@/lib/exam/types";

export type SignalKind = "question" | "deck" | "quiz" | "battle" | "selfcheck";
export type SignalSource = "engine" | "ai" | "curated" | "library" | "deck" | "selfcheck";

export interface LearningSignal {
  kind: SignalKind;
  source: SignalSource;
  item_key: string | null;
  syllabus_id: string | null;
  topic_key: string | null;
  correct: boolean | null;
  score: number | null;
  mistake_id: string | null;
  time_spent_seconds: number | null;
  props: Record<string, string | number | boolean | null>;
}

const KINDS: SignalKind[] = ["question", "deck", "quiz", "battle", "selfcheck"];
const SOURCES: SignalSource[] = ["engine", "ai", "curated", "library", "deck", "selfcheck"];
export const MAX_SIGNALS_PER_REQUEST = 50;

const text = (value: unknown, max: number): string | null => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null);

function cleanProps(value: unknown): LearningSignal["props"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: LearningSignal["props"] = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 8)) {
    if (!/^[a-z][a-z0-9_]{0,30}$/i.test(key)) continue;
    if (typeof item === "string") result[key] = item.slice(0, 80);
    else if (typeof item === "number" && Number.isFinite(item)) result[key] = item;
    else if (typeof item === "boolean" || item === null) result[key] = item;
  }
  return result;
}

export function sanitizeSignal(input: unknown): LearningSignal | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  if (!KINDS.includes(raw.kind as SignalKind) || !SOURCES.includes(raw.source as SignalSource)) return null;

  const seconds = typeof raw.time_spent_seconds === "number" && Number.isFinite(raw.time_spent_seconds) ? Math.round(raw.time_spent_seconds) : null;
  const score = typeof raw.score === "number" && Number.isFinite(raw.score) ? Math.max(0, Math.min(raw.score, 100)) : null;

  return {
    kind: raw.kind as SignalKind,
    source: raw.source as SignalSource,
    item_key: text(raw.item_key, 80),
    syllabus_id: text(raw.syllabus_id, 40),
    topic_key: text(raw.topic_key, 20),
    correct: typeof raw.correct === "boolean" ? raw.correct : null,
    score,
    mistake_id: text(raw.mistake_id, 40),
    time_spent_seconds: seconds !== null && seconds >= 0 && seconds <= 86_400 ? seconds : null,
    props: cleanProps(raw.props),
  };
}

export function sanitizeSignals(input: unknown): LearningSignal[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, MAX_SIGNALS_PER_REQUEST).map(sanitizeSignal).filter((signal): signal is LearningSignal => signal !== null);
}

/** One signal per answered question of a marked paper. Engine questions carry their generator id. */
export function signalsFromMarkedPaper(questions: ExamQuestion[], results: ExamResult[], kind: SignalKind = "question"): LearningSignal[] {
  const byId = new Map(questions.map((question) => [String(question.id), question]));
  const signals: LearningSignal[] = [];
  for (const result of results) {
    const question = byId.get(String(result.questionId));
    if (!question) continue;
    const generator = question.numeric?.generator ?? null;
    const source: SignalSource = generator ? "engine" : question.type === "multiple_choice" && question.modelAnswer && !question.numeric ? "curated" : "ai";
    signals.push({
      kind,
      source,
      item_key: generator,
      syllabus_id: null,
      topic_key: null,
      correct: Boolean(result.correct),
      score: result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : null,
      mistake_id: result.mistakeId ?? null,
      time_spent_seconds: typeof result.timeSpent === "number" && result.timeSpent >= 0 && result.timeSpent <= 86_400 ? Math.round(result.timeSpent) : null,
      props: { topic: (question.topic || "General").slice(0, 80), marks: question.marks },
    });
  }
  return signals;
}
