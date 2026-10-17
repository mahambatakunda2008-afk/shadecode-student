/**
 * src/lib/library/store.ts
 *
 * Loads the (small, public) lesson library and keeps a search index in memory for a few minutes.
 */

import { buildIndex, type Bm25Index, type LessonBlock, type LibraryDoc } from "./bm25";

export interface LibraryRow {
  id: string;
  title: string;
  topic: string | null;
  subject: string | null;
  difficulty: string | null;
  blocks: LessonBlock[];
  search_text: string;
  helpful_up: number;
  helpful_down: number;
}

interface LibraryClient {
  from(table: string): {
    select(columns: string): PromiseLike<{ data: unknown[] | null; error: unknown }>;
  };
}

const TTL_MS = 5 * 60_000;
let cache: { at: number; rows: Map<string, LibraryRow>; index: Bm25Index } | null = null;

export function resetLibraryCache() {
  cache = null;
}

export async function loadLibrary(client: LibraryClient, now: number = Date.now()) {
  if (cache && now - cache.at < TTL_MS) return cache;
  const { data, error } = await client.from("lesson_library").select("id, title, topic, subject, difficulty, blocks, search_text, helpful_up, helpful_down");
  if (error || !data) {
    if (cache) return cache; // serve slightly stale rather than fail
    throw error ?? new Error("library unavailable");
  }
  const rows = new Map<string, LibraryRow>();
  const docs: LibraryDoc[] = [];
  for (const raw of data as LibraryRow[]) {
    if (!raw?.id || !Array.isArray(raw.blocks)) continue;
    rows.set(raw.id, raw);
    docs.push({ id: raw.id, title: raw.title, topic: raw.topic, subject: raw.subject, text: raw.search_text, up: raw.helpful_up ?? 0, down: raw.helpful_down ?? 0 });
  }
  cache = { at: now, rows, index: buildIndex(docs) };
  return cache;
}
