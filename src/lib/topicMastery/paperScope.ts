/**
 * src/lib/topicMastery/paperScope.ts
 *
 * Reads the syllabus code Cambridge prints on every question paper
 * ("... PHYSICS 9702/22 ...") so a paper-learning session knows exactly which
 * syllabus, and which paper, its questions came from. That removes the
 * guesswork for subsection titles that repeat across papers or levels.
 *
 * Paper number is the first digit of the two-digit component code: 9709/32 is
 * Paper 3 (variant 2).
 */

export interface PaperScope {
  syllabusId: string;
  /** Paper number within the syllabus, when it could be read. */
  paper?: number;
}

const SUPPORTED_CODES: Record<string, number> = {
  "9700": 5,
  "9701": 5,
  "9702": 5,
  "9709": 6,
};

const CODE_PATTERN = /\b(9700|9701|9702|9709)\s*\/\s*(\d)(\d)\b/g;

/** Scans extracted page text (first match wins; the cover page prints it first). */
export function detectPaperScope(pageTexts: string[]): PaperScope | null {
  for (const text of pageTexts) {
    if (!text) continue;
    CODE_PATTERN.lastIndex = 0;
    const match = CODE_PATTERN.exec(text);
    if (!match) continue;

    const code = match[1];
    const paper = Number(match[2]);
    const scope: PaperScope = { syllabusId: `cambridge-${code}` };
    if (paper >= 1 && paper <= SUPPORTED_CODES[code]) scope.paper = paper;
    return scope;
  }
  return null;
}

/** Defensive read of the value we stored in paper_learning_sessions.source_metadata. */
export function readPaperScope(metadata: unknown): PaperScope | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = (metadata as Record<string, unknown>).paperScope;
  if (!raw || typeof raw !== "object") return null;
  const { syllabusId, paper } = raw as Record<string, unknown>;
  if (typeof syllabusId !== "string" || !/^cambridge-(9700|9701|9702|9709)$/.test(syllabusId)) return null;
  return typeof paper === "number" && Number.isInteger(paper) ? { syllabusId, paper } : { syllabusId };
}
