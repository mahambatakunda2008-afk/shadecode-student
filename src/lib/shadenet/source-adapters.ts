import type { ShadeNetResource } from "./content";
import type { KnowledgeQuery, KnowledgeSource } from "./retrieval";
import type { ShadeNetResourceClient } from "./client";

export interface PeerResourceCandidate {
  /** Must equal the resource's canonical contentHash. */
  resourceId: string;
  /** SHA-256 of the exact UTF-8 JSON payload transferred by ShadeNet. */
  payloadSha256: string;
}

export interface PeerResourceIndex {
  search(query: KnowledgeQuery, signal: AbortSignal): Promise<PeerResourceCandidate[]>;
}

export interface PeerResourceClient {
  get(
    request: { protocol: 1; requestId: string; resourceId: string },
    expectedSha256: string,
  ): Promise<ArrayBuffer | null>;
}

function decodeResource(bytes: ArrayBuffer): ShadeNetResource | null {
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== "object") return null;
    const value = parsed as Partial<ShadeNetResource>;
    if (
      typeof value.contentHash !== "string" ||
      !value.metadata ||
      typeof value.metadata !== "object" ||
      typeof value.metadata.title !== "string" ||
      typeof value.metadata.type !== "string" ||
      !("content" in value)
    ) return null;
    return value as ShadeNetResource;
  } catch {
    return null;
  }
}

/**
 * Adapts the existing ShadeNet verified-transfer client into the AI-free
 * knowledge search pipeline. The index must return only resources the current
 * learner is permitted to discover. The resource client verifies transferred
 * bytes; retrieveKnowledge separately verifies the canonical resource hash.
 */
export function createPeerKnowledgeSource(
  index: PeerResourceIndex,
  client: PeerResourceClient | Pick<ShadeNetResourceClient, "get">,
): KnowledgeSource {
  return {
    kind: "peer",
    async search(query, signal): Promise<ShadeNetResource[]> {
      const candidates = await index.search(query, signal);
      const resources: ShadeNetResource[] = [];
      for (const candidate of candidates.slice(0, Math.max(1, Math.min(20, query.limit ?? 8)))) {
        if (signal.aborted) throw new DOMException("Peer retrieval aborted", "AbortError");
        if (!candidate.resourceId || !/^[a-f0-9]{64}$/i.test(candidate.resourceId)) continue;
        if (!/^[a-f0-9]{64}$/i.test(candidate.payloadSha256)) continue;
        const bytes = await client.get(
          {
            protocol: 1,
            requestId: globalThis.crypto.randomUUID(),
            resourceId: candidate.resourceId,
          },
          candidate.payloadSha256,
        );
        if (!bytes) continue;
        const resource = decodeResource(bytes);
        if (resource && resource.contentHash.toLowerCase() === candidate.resourceId.toLowerCase()) {
          resources.push(resource);
        }
      }
      return resources;
    },
  };
}

export interface HttpKnowledgeSourceOptions {
  endpoint: string;
  fetcher?: typeof fetch;
  headers?: HeadersInit;
}

/**
 * Adapter for an explicitly configured HTTPS educational resource index.
 * It does not scrape arbitrary websites or call AI providers. The endpoint is
 * responsible for its own source permissions and must return ShadeNet resource
 * manifests; integrity is checked again by retrieveKnowledge.
 */
export function createHttpKnowledgeSource(options: HttpKnowledgeSourceOptions): KnowledgeSource {
  const endpoint = new URL(options.endpoint);
  if (endpoint.protocol !== "https:" && endpoint.hostname !== "localhost") {
    throw new Error("Knowledge index endpoint must use HTTPS");
  }
  const fetcher = options.fetcher ?? fetch;
  return {
    kind: "online",
    async search(query, signal): Promise<ShadeNetResource[]> {
      const url = new URL(endpoint.toString());
      url.searchParams.set("q", query.query.slice(0, 240));
      if (query.subject) url.searchParams.set("subject", query.subject);
      if (query.qualification) url.searchParams.set("qualification", query.qualification);
      if (query.syllabus) url.searchParams.set("syllabus", query.syllabus);
      if (query.type) url.searchParams.set("type", query.type);
      url.searchParams.set("limit", String(Math.max(1, Math.min(20, query.limit ?? 8))));
      const response = await fetcher(url, {
        method: "GET",
        headers: options.headers,
        signal,
        credentials: "omit",
        redirect: "error",
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Knowledge index returned HTTP ${response.status}`);
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object" || !Array.isArray((payload as { resources?: unknown }).resources)) {
        throw new Error("Knowledge index response has an invalid format");
      }
      return (payload as { resources: unknown[] }).resources.filter((item): item is ShadeNetResource => {
        if (!item || typeof item !== "object") return false;
        const value = item as Partial<ShadeNetResource>;
        return typeof value.contentHash === "string" &&
          !!value.metadata && typeof value.metadata.title === "string" &&
          typeof value.metadata.type === "string" && "content" in value;
      });
    },
  };
}
