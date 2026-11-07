/**
 * Shared machinery for hand-authored multiple-choice banks (Biology, Geography, ...).
 * A bank is marked exactly (the model answer is the correct option), needs no network and no AI.
 */

export interface CuratedMcq {
  question: string;
  options: string[];
  answer: string;
}

export interface CuratedTopic {
  topic: string;
  /** Whole words match as written (with an optional plural); a trailing `*` matches any word starting with the stem. */
  keywords: string[];
  questions: CuratedMcq[];
}

export interface CuratedSeed {
  topic: string;
  type: "multiple_choice";
  question: string;
  options: string[];
  marks: number;
  modelAnswer: string;
  markingCriteria: string;
}

function placementOf(text: string): number {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  return hash % 4;
}

/**
 * One correct answer and three wrong ones. The correct option's position is derived from the question text,
 * so it is stable and spread evenly across A-D instead of always sitting in the same place.
 */
export function mc(question: string, answer: string, wrong: [string, string, string]): CuratedMcq {
  const options = [...wrong];
  options.splice(placementOf(question), 0, answer);
  return { question, options, answer };
}

/** For options with a natural order (numbers, units, scales) that must be kept as written. */
export function ordered(question: string, options: [string, string, string, string], answer: string): CuratedMcq {
  return { question, options: [...options], answer };
}

function keywordMatches(text: string, keyword: string): boolean {
  const isStem = keyword.endsWith("*");
  const word = (isStem ? keyword.slice(0, -1) : keyword).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${word}${isStem ? "" : "(?:s|es)?\\b"}`).test(text);
}

/**
 * Topics whose keywords appear in the requested topic text. A broad request (empty, or only generic words such as
 * "core concepts") means the whole syllabus. Nothing matched means nothing is returned, so callers stay honest.
 */
export function matchTopics(topics: CuratedTopic[], topic: string, genericWords: RegExp): CuratedTopic[] {
  const text = topic.toLowerCase().trim();
  const hits = topics.filter((entry) => entry.keywords.some((keyword) => keywordMatches(text, keyword)));
  // A multi-word keyword ("first chimurenga", "protein synthesis") is more specific than a shared single word,
  // so when one matches, only the topics it names are used.
  const specific = hits.filter((entry) => entry.keywords.some((keyword) => /\s/.test(keyword.trim()) && keywordMatches(text, keyword)));
  if (specific.length) return specific;
  if (hits.length) return hits;
  return !text || genericWords.test(text) ? topics : [];
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const toSeed = (topic: string, item: CuratedMcq): CuratedSeed => ({
  topic,
  type: "multiple_choice",
  question: item.question,
  options: item.options,
  marks: 1,
  modelAnswer: item.answer,
  markingCriteria: "Award full credit only for the correct option.",
});

/**
 * Questions for a paper, or null when the topic is not covered. A broad request is interleaved across topics so a
 * short paper samples the whole syllabus, and every request is shuffled so a retake is not identical.
 */
export function buildBank(topics: CuratedTopic[], topic: string, genericWords: RegExp): CuratedSeed[] | null {
  const matched = matchTopics(topics, topic, genericWords);
  if (!matched.length) return null;
  const pools = matched.map((entry) => shuffled(entry.questions).map((item) => toSeed(entry.topic, item)));
  if (pools.length === 1) return pools[0];
  const order = shuffled(pools);
  const mixed: CuratedSeed[] = [];
  for (let i = 0; order.some((pool) => i < pool.length); i += 1) {
    for (const pool of order) if (i < pool.length) mixed.push(pool[i]);
  }
  return mixed;
}
