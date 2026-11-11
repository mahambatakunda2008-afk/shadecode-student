/**
 * src/lib/exam/curated/registry.ts
 *
 * One flat, reviewable list of every hand-authored question in the built-in banks.
 * Each question gets a content-derived ID, so a teacher's verdict is tied to the exact wording:
 * change the question, an option or the answer and the ID changes, which makes any old review stale on its own.
 * Pure and synchronous (no Node crypto), so it runs on the server, in the browser and in tests.
 */
import { BIOLOGY_TOPICS } from "./biology";
import { BUSINESS_TOPICS } from "./business";
import { ENGLISH_TOPICS } from "./english";
import { GEOGRAPHY_TOPICS } from "./geography";
import { HISTORY_TOPICS } from "./history";
import type { CuratedTopic } from "./bank";

export const REVIEW_VERDICTS = ["correct", "wrong_answer", "ambiguous", "out_of_syllabus"] as const;
export type ReviewVerdict = (typeof REVIEW_VERDICTS)[number];

export const REVIEW_BANKS = [
  { id: "biology", label: "Biology", topics: BIOLOGY_TOPICS },
  { id: "geography", label: "Geography", topics: GEOGRAPHY_TOPICS },
  { id: "history", label: "History", topics: HISTORY_TOPICS },
  { id: "english", label: "English Language", topics: ENGLISH_TOPICS },
  { id: "business", label: "Business / Commerce", topics: BUSINESS_TOPICS },
] as const satisfies ReadonlyArray<{ id: string; label: string; topics: CuratedTopic[] }>;

export type ReviewBankId = (typeof REVIEW_BANKS)[number]["id"];

export interface ReviewableQuestion {
  id: string;
  bank: ReviewBankId;
  bankLabel: string;
  topic: string;
  question: string;
  options: string[];
  answer: string;
}

/** cyrb53: a fast 53-bit string hash. Not cryptographic; it only needs to make accidental collisions negligible. */
function cyrb53(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** Option order is deliberately ignored: reshuffling the options does not change what a teacher must check. */
export function questionReviewId(bank: string, question: string, options: string[], answer: string): string {
  const canonical = [bank, question.trim(), answer.trim(), ...[...options].map((o) => o.trim()).sort()].join("\u241f");
  return `${bank}-${cyrb53(canonical)}`;
}

let cached: ReviewableQuestion[] | null = null;

export function allReviewableQuestions(): ReviewableQuestion[] {
  if (cached) return cached;
  const out: ReviewableQuestion[] = [];
  for (const bank of REVIEW_BANKS) {
    for (const topic of bank.topics) {
      for (const q of topic.questions) {
        out.push({
          id: questionReviewId(bank.id, q.question, q.options, q.answer),
          bank: bank.id,
          bankLabel: bank.label,
          topic: topic.topic,
          question: q.question,
          options: q.options,
          answer: q.answer,
        });
      }
    }
  }
  cached = out;
  return out;
}

export function isReviewVerdict(value: unknown): value is ReviewVerdict {
  return typeof value === "string" && (REVIEW_VERDICTS as readonly string[]).includes(value);
}
