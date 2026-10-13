/**
 * src/lib/library/bm25.ts
 *
 * Our own search engine for the lesson library: BM25 ranking with field boosts
 * (title and topic count more than body text), nudged by what learners found
 * helpful. No model, no network, instant, and it improves as votes arrive.
 */

import { tokenize } from "@/lib/topicMastery/resolver";

export interface LibraryDoc {
  id: string;
  title: string;
  topic: string | null;
  subject: string | null;
  text: string;
  up: number;
  down: number;
}

export interface Bm25Index {
  docs: Array<{ doc: LibraryDoc; weighted: Map<string, number>; length: number }>;
  idf: Map<string, number>;
  averageLength: number;
}

export interface SearchHit {
  id: string;
  score: number;
}

const K1 = 1.4;
const B = 0.75;
const TITLE_WEIGHT = 3;
const TOPIC_WEIGHT = 2;

function weightedTerms(doc: LibraryDoc): { weighted: Map<string, number>; length: number } {
  const weighted = new Map<string, number>();
  let length = 0;
  const add = (tokens: string[], weight: number) => {
    for (const token of tokens) {
      weighted.set(token, (weighted.get(token) ?? 0) + weight);
      length += weight;
    }
  };
  add(tokenize(doc.title), TITLE_WEIGHT);
  add(tokenize(doc.topic ?? ""), TOPIC_WEIGHT);
  add(tokenize(doc.text), 1);
  return { weighted, length };
}

export function buildIndex(docs: LibraryDoc[]): Bm25Index {
  const indexed = docs.map((doc) => ({ doc, ...weightedTerms(doc) }));
  const documentFrequency = new Map<string, number>();
  for (const entry of indexed) for (const term of entry.weighted.keys()) documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);

  const n = indexed.length;
  const idf = new Map<string, number>();
  for (const [term, df] of documentFrequency) idf.set(term, Math.log(1 + (n - df + 0.5) / (df + 0.5)));

  const averageLength = n ? indexed.reduce((sum, entry) => sum + entry.length, 0) / n : 0;
  return { docs: indexed, idf, averageLength };
}

/** What learners found helpful moves results a little: between 0.7 (disliked) and 1.3 (loved). */
export function qualityMultiplier(up: number, down: number): number {
  const approval = (up + 1) / (up + down + 2);
  return 0.7 + 0.6 * approval;
}

const subjectMatches = (docSubject: string | null, wanted: string) => !!docSubject && docSubject.toLowerCase().includes(wanted.toLowerCase());

export function search(index: Bm25Index, query: string, options: { subject?: string; limit?: number } = {}): SearchHit[] {
  const terms = [...new Set(tokenize(query))];
  if (!terms.length || !index.docs.length) return [];

  const hits: SearchHit[] = [];
  for (const entry of index.docs) {
    if (options.subject && !subjectMatches(entry.doc.subject, options.subject)) continue;
    let score = 0;
    for (const term of terms) {
      const tf = entry.weighted.get(term);
      if (!tf) continue;
      const idf = index.idf.get(term) ?? 0;
      score += idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + B * (entry.length / (index.averageLength || 1)))));
    }
    if (score > 0) hits.push({ id: entry.doc.id, score: score * qualityMultiplier(entry.doc.up, entry.doc.down) });
  }
  return hits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, options.limit ?? 8);
}

export interface LessonBlock {
  type?: string;
  title?: string;
  content?: string;
}

export interface Snippet {
  blockIndex: number;
  type: string;
  title: string;
  text: string;
}

const EXCERPT = 300;

/** The block that best answers the query, with an excerpt centred on its first matching word. */
export function bestSnippet(blocks: LessonBlock[], query: string): Snippet | null {
  const terms = new Set(tokenize(query));
  if (!terms.size || !blocks.length) return null;

  let best = -1;
  let bestScore = 0;
  blocks.forEach((block, index) => {
    const own = new Set(tokenize(`${block.title ?? ""} ${block.content ?? ""}`));
    const score = [...terms].filter((term) => own.has(term)).length;
    if (score > bestScore) { best = index; bestScore = score; }
  });
  if (best < 0) return null;

  const block = blocks[best];
  const content = (block.content ?? "").replace(/\s+/g, " ").trim();
  const firstMatch = content.split(/\s+/).findIndex((word) => tokenize(word).some((token) => terms.has(token)));
  const words = content.split(/\s+/);
  const start = Math.max(0, firstMatch - 8);
  let text = words.slice(start).join(" ");
  const trimmed = text.length > EXCERPT;
  text = text.slice(0, EXCERPT).trim();
  return { blockIndex: best, type: block.type ?? "text", title: block.title ?? "", text: `${start > 0 ? "… " : ""}${text}${trimmed ? " …" : ""}` };
}
