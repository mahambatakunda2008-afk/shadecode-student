/**
 * lib/exam-hub/searchQuery.ts
 *
 * Deterministic parser: turns a free-text query like
 * "Physics May June 2024 Paper 42" into structured filters, without an
 * AI call. Kept deterministic on purpose — instant, free, and good
 * enough for the structured part of a query (subject/year/session/paper
 * number). Genuinely fuzzy intent ("hard momentum questions") degrades
 * gracefully to a keyword search over exam_questions.question_text once
 * that table has content; it isn't faked with a made-up topic match.
 */

export interface ParsedQuery {
  year: number | null;
  session: "Feb/March" | "May/June" | "Oct/Nov" | "June" | "November" | null;
  level: string | null;
  paperNumber: number | null;
  variant: number | null;
  subjectKeywords: string[]; // remaining tokens to match against syllabi.subject
  keywords: string[]; // remaining tokens after structured extraction, for question_text search
}

const SESSION_PATTERNS: { pattern: RegExp; value: ParsedQuery["session"] }[] = [
  { pattern: /\bfeb(ruary)?[\s/-]*march\b/i, value: "Feb/March" },
  { pattern: /\bmay[\s/-]*june\b/i, value: "May/June" },
  { pattern: /\boct(ober)?[\s/-]*nov(ember)?\b/i, value: "Oct/Nov" },
  { pattern: /\bnovember\b/i, value: "November" },
  { pattern: /\bjune\b/i, value: "June" },
];

const LEVEL_PATTERNS: { pattern: RegExp; value: string }[] = [
  { pattern: /\bigcse\b/i, value: "IGCSE" },
  { pattern: /\bas[\s-]*level\b/i, value: "AS Level" },
  { pattern: /\ba[\s-]*level\b/i, value: "A Level" },
  { pattern: /\bo[\s-]*level\b/i, value: "O-Level" },
];

const STOPWORDS = new Set([
  "paper", "papers", "the", "a", "an", "of", "for", "in", "on", "questions", "question",
]);

export function parseSearchQuery(raw: string): ParsedQuery {
  let text = raw.trim();
  const consumed: string[] = [];

  let year: number | null = null;
  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    year = Number(yearMatch[0]);
    consumed.push(yearMatch[0]);
  }

  let session: ParsedQuery["session"] = null;
  for (const { pattern, value } of SESSION_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      session = value;
      consumed.push(m[0]);
      break;
    }
  }

  let level: string | null = null;
  for (const { pattern, value } of LEVEL_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      level = value;
      consumed.push(m[0]);
      break;
    }
  }

  let paperNumber: number | null = null;
  let variant: number | null = null;
  // "paper 42" (Cambridge convention: digit 1 = paper number, digit 2 = variant)
  const paperTwoDigit = text.match(/\bpaper\s*(\d)(\d)\b/i);
  if (paperTwoDigit) {
    paperNumber = Number(paperTwoDigit[1]);
    variant = Number(paperTwoDigit[2]);
    consumed.push(paperTwoDigit[0]);
  } else {
    const paperSingle = text.match(/\bpaper\s*(\d{1,2})\b/i);
    if (paperSingle) {
      paperNumber = Number(paperSingle[1]);
      consumed.push(paperSingle[0]);
    }
    const variantMatch = text.match(/\bvariant\s*(\d)\b/i);
    if (variantMatch) {
      variant = Number(variantMatch[1]);
      consumed.push(variantMatch[0]);
    }
  }

  for (const c of consumed) {
    text = text.replace(c, " ");
  }

  const remainingTokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));

  return {
    year,
    session,
    level,
    paperNumber,
    variant,
    subjectKeywords: remainingTokens,
    keywords: remainingTokens,
  };
}
