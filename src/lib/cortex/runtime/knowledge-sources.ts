import { createOpenWebKnowledgeSourceFromEnv } from "@/lib/shadenet/web-search";
import { readPublicWebDocument } from "@/lib/shadenet/web-document-reader";
import type { KnowledgeQuery } from "@/lib/shadenet/retrieval";
import type { ShadeNetResource } from "@/lib/shadenet/content";

export type CortexKnowledgeSource = {
  title: string;
  url: string;
  publisher: string;
  retrievedAt: string;
  verificationStatus: "unverified";
  content: string;
  extraction: "independently_fetched" | "search_excerpt_only";
};

export type CortexKnowledgeResult = {
  status: "available" | "unavailable" | "not_configured";
  sources: CortexKnowledgeSource[];
};

type SearchSource = NonNullable<ReturnType<typeof createOpenWebKnowledgeSourceFromEnv>>;
type Search = (query: KnowledgeQuery, signal: AbortSignal) => Promise<ShadeNetResource[]>;
type Read = (url: string, query: KnowledgeQuery) => Promise<ShadeNetResource>;

function resourceText(resource: ShadeNetResource): string {
  const content = resource.content;
  if (typeof content === "string") return content.slice(0, 8_000);
  if (!content || typeof content !== "object") return "";
  const value = content as Record<string, unknown>;
  return [value.text, value.pageText, value.snippet]
    .filter((part): part is string => typeof part === "string")
    .join("\n")
    .slice(0, 8_000);
}

function retrievedAt(resource: ShadeNetResource): string {
  const content = resource.content && typeof resource.content === "object"
    ? resource.content as Record<string, unknown>
    : {};
  return typeof content.retrievedAt === "string" ? content.retrievedAt : resource.metadata.createdAt;
}

async function boundedSearch(search: Search, query: KnowledgeQuery): Promise<ShadeNetResource[]> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      search(query, controller.signal),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error("Cortex web retrieval timed out."));
        }, 8_000);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

/**
 * Server-only online research adapter for Cortex. Search results remain
 * unverified. Up to two result pages are independently fetched through the
 * SSRF-safe bounded document reader; a page-read failure retains only its
 * original search excerpt and never upgrades its verification status.
 */
export async function retrieveCortexKnowledge(
  input: {
    topic: string;
    subject?: string;
    qualification?: string;
    syllabus?: string;
  },
  dependencies?: {
    source?: SearchSource | null;
    search?: Search;
    read?: Read;
  },
): Promise<CortexKnowledgeResult> {
  const source = dependencies?.source === undefined
    ? createOpenWebKnowledgeSourceFromEnv()
    : dependencies.source;
  if (!source && !dependencies?.search) return { status: "not_configured", sources: [] };

  const query: KnowledgeQuery = {
    query: input.topic.slice(0, 240),
    subject: input.subject?.slice(0, 80),
    qualification: input.qualification?.slice(0, 80),
    syllabus: input.syllabus?.slice(0, 40),
    limit: 4,
  };

  try {
    const candidates = await boundedSearch(
      dependencies?.search ?? ((value, signal) => source!.search(value, signal)),
      query,
    );
    const unique = candidates.filter((resource, index, all) =>
      Boolean(resource.metadata.source) &&
      all.findIndex((item) => item.metadata.source === resource.metadata.source) === index
    ).slice(0, 4);

    const sources = await Promise.all(unique.map(async (resource): Promise<CortexKnowledgeSource> => {
      const url = resource.metadata.source!;
      const base = {
        title: resource.metadata.title.slice(0, 240),
        url,
        publisher: (resource.metadata.authorOrPublisher || new URL(url).hostname).slice(0, 160),
        retrievedAt: retrievedAt(resource),
        verificationStatus: "unverified" as const,
      };
      try {
        const document = await (dependencies?.read ?? ((target, value) => readPublicWebDocument({
          url: target,
          subject: value.subject,
          qualification: value.qualification,
          syllabus: value.syllabus,
        })))(url, query);
        const text = resourceText(document);
        return { ...base, content: text || resourceText(resource), extraction: text ? "independently_fetched" : "search_excerpt_only" };
      } catch {
        return { ...base, content: resourceText(resource), extraction: "search_excerpt_only" };
      }
    }));

    const useful = sources.filter((item) => item.content.trim().length > 0);
    return { status: useful.length ? "available" : "unavailable", sources: useful };
  } catch {
    return { status: "unavailable", sources: [] };
  }
}
