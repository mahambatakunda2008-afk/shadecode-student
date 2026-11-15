import "server-only";

import { createResource, type ShadeNetResource } from "./content";
import type { KnowledgeQuery, KnowledgeSource } from "./retrieval";

interface WebSearchItem {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
  publisher?: string;
}

type Fetcher = typeof fetch;

function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2_048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (url.hostname === "localhost" || url.hostname.endsWith(".localhost") || url.hostname.endsWith(".local")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function boundedText(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

async function requestJson(fetcher: Fetcher, url: string, init: RequestInit, signal: AbortSignal): Promise<unknown> {
  const response = await fetcher(url, {
    ...init,
    signal,
    redirect: "error",
    cache: "no-store",
    headers: { accept: "application/json", ...init.headers },
  });
  if (!response.ok) throw new Error(`Web search provider returned HTTP ${response.status}`);
  return response.json();
}

function mapBrave(payload: unknown): WebSearchItem[] {
  if (!payload || typeof payload !== "object") return [];
  const web = (payload as { web?: { results?: unknown } }).web;
  if (!Array.isArray(web?.results)) return [];
  return web.results.slice(0, 10).flatMap((entry): WebSearchItem[] => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    const url = safeHttpUrl(item.url);
    const title = boundedText(item.title, 240);
    const snippet = boundedText(item.description, 1_200);
    if (!url || !title || !snippet) return [];
    return [{ title, url, snippet, publishedAt: boundedText(item.page_age, 80) || undefined, publisher: new URL(url).hostname }];
  });
}

function mapTavily(payload: unknown): WebSearchItem[] {
  if (!payload || typeof payload !== "object") return [];
  const results = (payload as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];
  return results.slice(0, 10).flatMap((entry): WebSearchItem[] => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    const url = safeHttpUrl(item.url);
    const title = boundedText(item.title, 240);
    const snippet = boundedText(item.content, 1_200);
    if (!url || !title || !snippet) return [];
    return [{ title, url, snippet, publishedAt: boundedText(item.published_date, 80) || undefined, publisher: new URL(url).hostname }];
  });
}

async function toResources(items: WebSearchItem[], query: KnowledgeQuery): Promise<ShadeNetResource[]> {
  const seen = new Set<string>();
  const resources: ShadeNetResource[] = [];
  for (const item of items) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    resources.push(await createResource({
      metadata: {
        type: "other",
        title: item.title,
        subject: query.subject,
        qualification: query.qualification,
        syllabus: query.syllabus,
        source: item.url,
        authorOrPublisher: item.publisher,
        verificationStatus: "unverified",
        createdAt: new Date().toISOString(),
      },
      content: {
        kind: "web-search-result",
        snippet: item.snippet,
        publishedAt: item.publishedAt ?? null,
        retrievedAt: new Date().toISOString(),
        provenance: "Search-result excerpt. The full source page has not yet been independently fetched or verified.",
      },
    }));
  }
  return resources;
}

/** Brave Search API adapter. The API key remains server-side. */
export function createBraveWebSearchSource(apiKey: string, fetcher: Fetcher = fetch): KnowledgeSource {
  if (!apiKey.trim()) throw new Error("Brave Search API key is required");
  return {
    kind: "online",
    async search(query, signal) {
      const url = new URL("https://api.search.brave.com/res/v1/web/search");
      url.searchParams.set("q", query.query.slice(0, 240));
      url.searchParams.set("count", String(Math.max(1, Math.min(10, query.limit ?? 8))));
      url.searchParams.set("safesearch", "moderate");
      const payload = await requestJson(fetcher, url.toString(), {
        headers: { "X-Subscription-Token": apiKey },
      }, signal);
      return toResources(mapBrave(payload), query);
    },
  };
}

/** Tavily Search API adapter, used when Brave is not configured. */
export function createTavilyWebSearchSource(apiKey: string, fetcher: Fetcher = fetch): KnowledgeSource {
  if (!apiKey.trim()) throw new Error("Tavily API key is required");
  return {
    kind: "online",
    async search(query, signal) {
      const payload = await requestJson(fetcher, "https://api.tavily.com/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query: query.query.slice(0, 240),
          search_depth: "basic",
          max_results: Math.max(1, Math.min(10, query.limit ?? 8)),
          include_answer: false,
          include_raw_content: false,
        }),
      }, signal);
      return toResources(mapTavily(payload), query);
    },
  };
}

/** Returns null when no provider is configured, preserving local/offline operation. */
export function createOpenWebKnowledgeSourceFromEnv(fetcher: Fetcher = fetch): KnowledgeSource | null {
  const braveKey = process.env.BRAVE_SEARCH_API_KEY?.trim();
  if (braveKey) return createBraveWebSearchSource(braveKey, fetcher);
  const tavilyKey = process.env.TAVILY_API_KEY?.trim();
  if (tavilyKey) return createTavilyWebSearchSource(tavilyKey, fetcher);
  return null;
}
