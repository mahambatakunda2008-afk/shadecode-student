import { contentHash, type ShadeNetResource } from "./content";
import { shadeNetStore, type ShadeNetStore } from "./store";

export type KnowledgeSourceKind = "local" | "peer" | "online";

export interface KnowledgeQuery {
  query: string;
  subject?: string;
  qualification?: string;
  syllabus?: string;
  type?: ShadeNetResource["metadata"]["type"];
  limit?: number;
}

export interface KnowledgeSource {
  kind: Exclude<KnowledgeSourceKind, "local">;
  search(query: KnowledgeQuery, signal: AbortSignal): Promise<ShadeNetResource[]>;
}

export interface KnowledgeSources {
  local?: { search(query: KnowledgeQuery): Promise<ShadeNetResource[]> };
  peers?: KnowledgeSource;
  online?: KnowledgeSource;
  perSourceTimeoutMs?: number;
}

export interface RetrievedKnowledge {
  resource: ShadeNetResource;
  source: KnowledgeSourceKind;
}

export interface KnowledgeRetrievalResult {
  results: RetrievedKnowledge[];
  attempted: KnowledgeSourceKind[];
  unavailable: KnowledgeSourceKind[];
}

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;
const DEFAULT_TIMEOUT_MS = 4_000;
const MAX_TIMEOUT_MS = 15_000;

function normalize(value: unknown): string {
  return String(value ?? "").normalize("NFKC").toLowerCase().trim();
}

function contentText(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return "";
  }
}

function scoreResource(resource: ShadeNetResource, query: KnowledgeQuery): number {
  const terms = normalize(query.query).split(/\s+/).filter((term) => term.length > 1);
  const metadata = resource.metadata;
  if (query.subject && normalize(metadata.subject) !== normalize(query.subject)) return 0;
  if (query.qualification && normalize(metadata.qualification) !== normalize(query.qualification)) return 0;
  if (query.syllabus && normalize(metadata.syllabus) !== normalize(query.syllabus)) return 0;
  if (query.type && metadata.type !== query.type) return 0;
  if (terms.length === 0) return query.subject || query.qualification || query.syllabus || query.type ? 1 : 0;

  const title = normalize(metadata.title);
  const subject = normalize(metadata.subject);
  const details = normalize([
    metadata.qualification,
    metadata.syllabus,
    metadata.source,
    metadata.authorOrPublisher,
    contentText(resource.content),
  ].join(" "));
  let score = 0;
  for (const term of terms) {
    if (title.includes(term)) score += 5;
    else if (subject.includes(term)) score += 3;
    else if (details.includes(term)) score += 1;
  }
  return score;
}

/** Deterministic, AI-free search across resources already available to the device. */
export function searchKnowledgeResources(
  resources: ShadeNetResource[],
  query: KnowledgeQuery,
): ShadeNetResource[] {
  const limit = Math.max(1, Math.min(MAX_LIMIT, Math.floor(query.limit ?? DEFAULT_LIMIT)));
  return resources
    .map((resource) => ({ resource, score: scoreResource(resource, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.resource.metadata.title.localeCompare(b.resource.metadata.title))
    .slice(0, limit)
    .map((item) => item.resource);
}

export function createLocalKnowledgeSource(store: Pick<ShadeNetStore, "list"> = shadeNetStore) {
  return {
    async search(query: KnowledgeQuery): Promise<ShadeNetResource[]> {
      return searchKnowledgeResources(await store.list(), query);
    },
  };
}

async function withinTimeout<T>(promise: Promise<T>, timeoutMs: number, controller: AbortController): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error("Knowledge source timed out"));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function isAuthenticResource(resource: ShadeNetResource): Promise<boolean> {
  try {
    const actual = await contentHash({ metadata: resource.metadata, content: resource.content });
    return actual.toLowerCase() === resource.contentHash.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Queries local resources first, then opted-in peers, then ordinary online
 * sources. It never invokes an AI provider. Remote adapters must enforce their
 * own consent, access-control, and source-licensing policies.
 */
export async function retrieveKnowledge(
  query: KnowledgeQuery,
  sources: KnowledgeSources,
): Promise<KnowledgeRetrievalResult> {
  const attempted: KnowledgeSourceKind[] = [];
  const unavailable: KnowledgeSourceKind[] = [];
  const results: RetrievedKnowledge[] = [];
  const seen = new Set<string>();
  const limit = Math.max(1, Math.min(MAX_LIMIT, Math.floor(query.limit ?? DEFAULT_LIMIT)));
  const timeoutMs = Math.max(250, Math.min(MAX_TIMEOUT_MS, sources.perSourceTimeoutMs ?? DEFAULT_TIMEOUT_MS));

  const local = sources.local ?? createLocalKnowledgeSource();
  const layers: Array<{ kind: KnowledgeSourceKind; source: { search: (query: KnowledgeQuery, signal?: AbortSignal) => Promise<ShadeNetResource[]> } }> = [
    { kind: "local", source: local },
    ...(sources.peers ? [{ kind: "peer" as const, source: sources.peers }] : []),
    ...(sources.online ? [{ kind: "online" as const, source: sources.online }] : []),
  ];

  for (const layer of layers) {
    if (results.length >= limit) break;
    attempted.push(layer.kind);
    const controller = new AbortController();
    try {
      const candidates = await withinTimeout(
        layer.source.search(query, controller.signal),
        timeoutMs,
        controller,
      );
      for (const resource of searchKnowledgeResources(candidates, query,)) {
        if (results.length >= limit) break;
        if (!resource.contentHash || seen.has(resource.contentHash)) continue;
        if (!(await isAuthenticResource(resource))) continue;
        seen.add(resource.contentHash);
        results.push({ resource, source: layer.kind });
      }
    } catch {
      unavailable.push(layer.kind);
    }
  }

  return { results, attempted, unavailable };
}
