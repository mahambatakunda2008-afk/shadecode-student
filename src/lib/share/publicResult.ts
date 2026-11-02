/**
 * src/lib/share/publicResult.ts
 *
 * The ONLY shape of an exam result that may leave the database for a public
 * share page or OG image. It is built from an allow-list: user_id, weak_areas
 * and any display name are never read, so they cannot leak even if the query
 * widens later. Derivation reuses challengeFromResult so a shared card and a
 * challenge can never disagree about the same stored result.
 */

import { challengeFromResult, type ExamResultRow } from "@/lib/challenge/fromResult";

/** Columns the public page may select. Deliberately excludes user_id and weak_areas. */
export const PUBLIC_RESULT_COLUMNS =
  "subject, topic, difficulty, score, total_questions, correct_answers, time_taken, created_at";

export interface PublicResult {
  subject: string;
  topic: string | null;
  difficulty: string;
  percentage: number;
  correct: number;
  total: number;
  grade: string;
  timeSeconds: number | null;
  completedAt: string | null;
}

export type PublicResultRow = ExamResultRow & { created_at?: unknown };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isResultId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function toPublicResult(row: PublicResultRow | null | undefined): PublicResult | null {
  const fields = challengeFromResult(row);
  if (!fields || !row) return null;
  const created = typeof row.created_at === "string" && !Number.isNaN(Date.parse(row.created_at)) ? row.created_at : null;
  return {
    subject: fields.subject,
    topic: fields.topic,
    difficulty: fields.difficulty,
    percentage: fields.percentage,
    correct: fields.total_score,
    total: fields.max_score,
    grade: fields.grade,
    timeSeconds: fields.time_taken,
    completedAt: created,
  };
}

export function formatDuration(seconds: number | null): string | null {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return null;
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function resultTitle(r: PublicResult): string {
  return `${r.percentage}% on ${r.subject} (${r.difficulty})`;
}

export function resultDescription(r: PublicResult): string {
  return `${r.correct}/${r.total} correct · Grade ${r.grade}. Can you beat it on Shadecode Student?`;
}

export function resultShareText(r: PublicResult, url: string): string {
  return `I scored ${r.correct}/${r.total} (${r.percentage}%, Grade ${r.grade}) on ${r.subject} ${r.difficulty} on Shadecode Student.\n\nCan you beat me? ${url}`;
}

export const GRADE_HEX: Record<string, string> = {
  "A*": "#34d399", A: "#34d399", B: "#60a5fa", C: "#facc15", D: "#fb923c", E: "#fb923c", U: "#f87171",
};
