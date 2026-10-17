/**
 * src/lib/library/recover.ts
 *
 * Picks a library lesson to stand in when lesson generation fails. A wrong
 * lesson is worse than an honest error, so this is deliberately strict: the
 * lesson's title or topic must cover most of the words the student asked about.
 */

import { search, type Bm25Index } from "./bm25";
import type { LibraryRow } from "./store";
import { tokenize } from "@/lib/topicMastery/resolver";

const MIN_COVERAGE = 0.6;
const MIN_BLOCKS = 4;

export function recoverLesson(index: Bm25Index, rows: Map<string, LibraryRow>, subject: string, topic: string): LibraryRow | null {
  const wanted = [...new Set(tokenize(topic))];
  if (!wanted.length) return null;

  for (const hit of search(index, topic, { subject: subject.trim() || undefined, limit: 5 })) {
    const row = rows.get(hit.id);
    if (!row || row.blocks.length < MIN_BLOCKS) continue;
    const heading = new Set(tokenize(`${row.title} ${row.topic ?? ""}`));
    const covered = wanted.filter((token) => heading.has(token)).length;
    if (covered / wanted.length >= MIN_COVERAGE) return row;
  }
  return null;
}
