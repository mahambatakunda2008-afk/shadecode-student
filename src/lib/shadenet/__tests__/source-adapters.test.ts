import { describe, expect, it, vi } from "vitest";
import { createResource } from "../content";
import { createHttpKnowledgeSource, createPeerKnowledgeSource } from "../source-adapters";

describe("ShadeNet source adapters", () => {
  it("retrieves a resource through a peer adapter", async () => {
    const resource = await createResource({ metadata: { type: "lesson", title: "Waves", subject: "Physics", createdAt: "2026-10-20T00:00:00.000Z" }, content: "Wave speed" });
    const bytes = new TextEncoder().encode(JSON.stringify(resource)).buffer;
    const index = { search: vi.fn(async () => [{ resourceId: resource.contentHash, payloadSha256: "a".repeat(64) }]) };
    const client = { get: vi.fn(async () => bytes) };
    const source = createPeerKnowledgeSource(index, client);
    const results = await source.search({ query: "waves" }, new AbortController().signal);
    expect(results).toEqual([resource]);
    expect(client.get).toHaveBeenCalledOnce();
  });

  it("queries an explicitly configured HTTPS knowledge index", async () => {
    const resource = await createResource({
      metadata: { type: "lesson", title: "Waves", subject: "Physics", createdAt: "2026-10-20T00:00:00.000Z" },
      content: "Wave speed",
    });
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      expect(url.searchParams.get("q")).toBe("waves");
      expect(url.searchParams.get("subject")).toBe("Physics");
      return new Response(JSON.stringify({ resources: [resource, { title: "invalid" }] }), { status: 200 });
    });
    const source = createHttpKnowledgeSource({ endpoint: "https://knowledge.example.test/search", fetcher });
    const results = await source.search({ query: "waves", subject: "Physics" }, new AbortController().signal);
    expect(results).toEqual([resource]);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("rejects a non-HTTPS remote knowledge index", () => {
    expect(() => createHttpKnowledgeSource({ endpoint: "http://knowledge.example.test/search" })).toThrow("HTTPS");
  });

});
