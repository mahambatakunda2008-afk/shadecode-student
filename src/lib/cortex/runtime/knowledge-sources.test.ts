import { describe, expect, it, vi } from "vitest";
import { retrieveCortexKnowledge } from "./knowledge-sources";
import type { ShadeNetResource } from "@/lib/shadenet/content";

function resource(url = "https://example.org/topic") : ShadeNetResource {
  return {
    contentHash: "hash",
    metadata: {
      type: "other",
      title: "Topic reference",
      subject: "Biology",
      source: url,
      authorOrPublisher: "Example publisher",
      verificationStatus: "unverified",
      createdAt: "2026-11-17T00:00:00.000Z",
    },
    content: {
      kind: "web-search-result",
      snippet: "A short search excerpt about the topic.",
      retrievedAt: "2026-11-17T00:00:00.000Z",
    },
  };
}

describe("retrieveCortexKnowledge", () => {
  it("reports missing provider configuration without throwing", async () => {
    await expect(retrieveCortexKnowledge({ topic: "cell division" }, { source: null }))
      .resolves.toEqual({ status: "not_configured", sources: [] });
  });

  it("retains provenance and unverified status after an independent page read", async () => {
    const search = vi.fn().mockResolvedValue([resource()]);
    const read = vi.fn().mockResolvedValue({
      ...resource(),
      content: { kind: "web-document", text: "Independently fetched reference text with enough detail." },
    });
    const result = await retrieveCortexKnowledge(
      { topic: "cell division", subject: "Biology" },
      { search, read },
    );

    expect(search).toHaveBeenCalledWith(expect.objectContaining({
      query: "cell division",
      subject: "Biology",
      limit: 4,
    }), expect.any(AbortSignal));
    expect(read).toHaveBeenCalledWith("https://example.org/topic", expect.objectContaining({ subject: "Biology" }));
    expect(result.status).toBe("available");
    expect(result.sources[0]).toMatchObject({
      url: "https://example.org/topic",
      publisher: "Example publisher",
      verificationStatus: "unverified",
      extraction: "independently_fetched",
    });
  });

  it("keeps the search excerpt when a page read fails", async () => {
    const result = await retrieveCortexKnowledge(
      { topic: "cell division" },
      {
        search: vi.fn().mockResolvedValue([resource()]),
        read: vi.fn().mockRejectedValue(new Error("page unavailable")),
      },
    );

    expect(result.status).toBe("available");
    expect(result.sources[0].extraction).toBe("search_excerpt_only");
    expect(result.sources[0].verificationStatus).toBe("unverified");
    expect(result.sources[0].content).toContain("search excerpt");
  });

  it("returns an explicit unavailable result when the search provider fails", async () => {
    await expect(retrieveCortexKnowledge(
      { topic: "cell division" },
      { search: vi.fn().mockRejectedValue(new Error("provider down")) },
    )).resolves.toEqual({ status: "unavailable", sources: [] });
  });

  it("deduplicates source URLs and bounds the number of sources", async () => {
    const search = vi.fn().mockResolvedValue([
      resource(), resource(), resource("https://example.org/second"),
      resource("https://example.org/third"), resource("https://example.org/fourth"),
      resource("https://example.org/fifth"),
    ]);
    const result = await retrieveCortexKnowledge(
      { topic: "cell division" },
      { search, read: vi.fn().mockRejectedValue(new Error("not readable")) },
    );

    expect(result.sources).toHaveLength(4);
    expect(new Set(result.sources.map((item) => item.url)).size).toBe(4);
  });
});
