/**
 * src/lib/study/revisionDeck.ts
 *
 * Retrieval-practice decks built straight from the verified syllabus outcomes.
 * No model is involved, so a deck can never fail, time out or invent content:
 * every card is an official learning outcome turned into a recall prompt.
 *
 * These are honest self-check cards. The back shows the official outcome and
 * points the student to their notes; the student rates how well they could
 * answer, and that rating (a softer signal than an exam) feeds mastery.
 */

import { createRng } from "@/lib/exam/engine/rng";

export interface OutcomeRow {
  knowledge_key: string;
  topic_key: string;
  title: string;
  content: string;
  objective_keys?: string[] | null;
  level?: string | null;
}

export interface RevisionCard {
  id: string;
  topicKey: string;
  topicTitle: string;
  outcomeKey: string;
  level: string | null;
  front: string;
  back: string;
}

export type RevisionRating = "got_it" | "unsure" | "not_yet";

/** Self-assessment is weaker evidence than an exam, so the scores are deliberately conservative. */
export const RATING_EVIDENCE: Record<RevisionRating, { evidence: number; verdict: "correct" | "partially_correct" | "incorrect" }> = {
  got_it: { evidence: 85, verdict: "correct" },
  unsure: { evidence: 50, verdict: "partially_correct" },
  not_yet: { evidence: 15, verdict: "incorrect" },
};

export function isRevisionRating(value: unknown): value is RevisionRating {
  return value === "got_it" || value === "unsure" || value === "not_yet";
}

const strip = (text: string) => text.replace(/\s+/g, " ").trim().replace(/[.;:\s]+$/u, "");

/** Turns an outcome ("Understand the idea of a function") into a prompt a student can answer aloud. */
export function promptFromOutcome(outcome: string): string {
  const text = strip(outcome);
  const match = text.match(/^(understand|know|recall|recognise|recognize|use)\b\s*(.*)$/i);
  if (!match) return `${text}.`;

  const [, verb, rest] = match;
  const lower = verb.toLowerCase();
  if (!rest) return `${text}.`;
  if (lower === "understand") return /^that\b/i.test(rest) ? `Show you understand ${rest}.` : `Explain ${rest}.`;
  if (lower === "know" || lower === "recall") return `Recall: ${rest}.`;
  if (lower === "use") return `Show how you would use ${rest}.`;
  return `Show how to recognise ${rest}.`;
}

const outcomeKeyOf = (row: OutcomeRow) => row.objective_keys?.[0] ?? row.knowledge_key;

const compareKeys = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

export interface DeckOptions {
  topicKey?: string;
  limit?: number;
  seed?: number;
}

export function buildRevisionDeck(rows: OutcomeRow[], options: DeckOptions = {}): RevisionCard[] {
  const limit = Math.max(1, Math.min(options.limit ?? 20, 60));
  const selected = rows
    .filter((row) => row.content?.trim() && (!options.topicKey || row.topic_key === options.topicKey))
    .sort((a, b) => compareKeys(outcomeKeyOf(a), outcomeKeyOf(b)));

  const chosen = selected.length > limit && options.seed !== undefined ? createRng(options.seed).shuffle(selected).slice(0, limit) : selected.slice(0, limit);

  return chosen.map((row) => {
    const outcomeKey = outcomeKeyOf(row);
    const topicTitle = row.title.split(": outcome ")[0];
    return {
      id: row.knowledge_key,
      topicKey: row.topic_key,
      topicTitle,
      outcomeKey,
      level: row.level ?? null,
      front: promptFromOutcome(row.content),
      back: `Check your answer against your notes or lesson.\n\nOfficial outcome ${outcomeKey}: ${strip(row.content)}.`,
    };
  });
}
