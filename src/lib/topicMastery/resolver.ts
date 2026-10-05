/**
 * src/lib/topicMastery/resolver.ts
 *
 * Pure, deterministic mapping from a free-text topic label (often an AI
 * "expected concept") onto a verified curriculum subsection.
 *
 * Contract: resolve only when the answer is unambiguous. A wrong key is worse
 * than no key, because prerequisite edges and roll-ups trust it. Anything
 * uncertain returns `none` or `ambiguous` and the caller keeps the clean
 * free-text label with null curriculum columns.
 */

export interface CurriculumTopicUnit {
  syllabusId: string;
  /** Subject slug from curriculum_versions.subject_id, e.g. "physics". */
  subjectId: string;
  /** Subsection key, e.g. "1.1". */
  topicKey: string;
  title: string;
}

export type TopicResolution =
  | { status: "resolved"; unit: CurriculumTopicUnit; confidence: "exact" | "contained" }
  | { status: "ambiguous"; candidates: CurriculumTopicUnit[] }
  | { status: "none" };

const STOPWORDS = new Set([
  "a", "an", "and", "the", "of", "in", "on", "to", "for", "with", "by", "at", "as", "is", "are", "its", "their", "from", "into", "using", "use",
]);

/** Minimum characters of title signal needed to trust a containment match. */
const MIN_CONTAINED_TOKENS = 2;

export function tokenize(value: string): string[] {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token && !STOPWORDS.has(token))
    .map(stem);
}

function stem(token: string): string {
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss") && !token.endsWith("us")) return token.slice(0, -1);
  return token;
}

/** Maps a free-text subject ("A Level Physics", "Maths") onto curriculum subject slugs. */
export function subjectIdsFor(subject: string): string[] {
  const text = ` ${tokenize(subject).join(" ")} `;
  const ids: string[] = [];
  if (/ physic /.test(text)) ids.push("physics");
  if (/ chemistry /.test(text)) ids.push("chemistry");
  if (/ biology /.test(text)) ids.push("biology");
  if (/ (math|maths|mathematic) /.test(text)) ids.push("mathematics");
  if (/ (computer|computing|cs) /.test(text)) ids.push("computer-science");
  return ids;
}

interface IndexedUnit {
  unit: CurriculumTopicUnit;
  tokens: string[];
  tokenSet: Set<string>;
  normalized: string;
}

export interface TopicIndex {
  units: IndexedUnit[];
}

export function buildTopicIndex(units: CurriculumTopicUnit[]): TopicIndex {
  const seen = new Set<string>();
  const indexed: IndexedUnit[] = [];
  for (const unit of units) {
    const dedupeKey = `${unit.syllabusId}|${unit.topicKey}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    const tokens = tokenize(unit.title);
    if (!tokens.length) continue;
    indexed.push({ unit, tokens, tokenSet: new Set(tokens), normalized: tokens.join(" ") });
  }
  return { units: indexed };
}

export function resolveTopic(label: string, subject: string, index: TopicIndex): TopicResolution {
  const labelTokens = tokenize(label);
  if (!labelTokens.length) return { status: "none" };

  const subjectIds = subjectIdsFor(subject);
  if (!subjectIds.length) return { status: "none" };

  const pool = index.units.filter((entry) => subjectIds.includes(entry.unit.subjectId));
  if (!pool.length) return { status: "none" };

  const labelNormalized = labelTokens.join(" ");
  const labelSet = new Set(labelTokens);

  // 1. Exact title match (after normalisation).
  const exact = pool.filter((entry) => entry.normalized === labelNormalized);
  if (exact.length === 1) return { status: "resolved", unit: exact[0].unit, confidence: "exact" };
  if (exact.length > 1) return { status: "ambiguous", candidates: exact.map((entry) => entry.unit) };

  // 2. The curriculum title is fully contained in the label (label is more specific),
  //    or the label is fully contained in a multi-word title.
  const contained = pool.filter((entry) => {
    const titleInLabel = entry.tokens.length >= MIN_CONTAINED_TOKENS && entry.tokens.every((token) => labelSet.has(token));
    const labelInTitle = labelTokens.length >= MIN_CONTAINED_TOKENS && labelTokens.every((token) => entry.tokenSet.has(token));
    return titleInLabel || labelInTitle;
  });

  if (contained.length === 1) return { status: "resolved", unit: contained[0].unit, confidence: "contained" };
  if (contained.length > 1) {
    // Prefer the longest title match only when it is strictly more specific than all others.
    const longest = Math.max(...contained.map((entry) => entry.tokens.length));
    const top = contained.filter((entry) => entry.tokens.length === longest);
    if (top.length === 1) return { status: "resolved", unit: top[0].unit, confidence: "contained" };
    return { status: "ambiguous", candidates: top.map((entry) => entry.unit) };
  }

  return { status: "none" };
}
