import { describe, expect, it, vi } from "vitest";
import { createBraveWebSearchSource, createTavilyWebSearchSource } from "../web-search";

describe("open web knowledge search adapters", () => {
  it("maps Brave web results into provenance-preserving unverified resources", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      web: { results: [
        { title: "Wave motion", url: "https://physics.example.org/waves", description: "An introduction to wave motion." },
        { title: "Unsafe", url: "javascript:alert(1)", description: "Ignore" },
      ] },
    }), { status: 200 }));
    const source = createBraveWebSearchSource("test-key", fetcher as unknown as typeof fetch);
    const results = await source.search({ query: "wave motion", subject: "Physics" }, new AbortController().signal);
    expect(results).toHaveLength(1);
    expect(results[0].metadata.title).toBe("Wave motion");
    expect(results[0].metadata.source).toBe("https://physics.example.org/waves");
    expect(results[0].metadata.verificationStatus).toBe("unverified");
    expect(results[0].content).toMatchObject({ kind: "web-search-result", snippet: "An introduction to wave motion." });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("uses Tavily result content while rejecting non-HTTPS URLs", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      results: [
        { title: "Photosynthesis", url: "https://biology.example.org/photo", content: "Light energy is converted to chemical energy." },
        { title: "Local", url: "http://127.0.0.1/private", content: "Not a public source." },
      ],
    }), { status: 200 }));
    const source = createTavilyWebSearchSource("test-key", fetcher as unknown as typeof fetch);
    const results = await source.search({ query: "photosynthesis" }, new AbortController().signal);
    expect(results).toHaveLength(1);
    expect(results[0].metadata.title).toBe("Photosynthesis");
  });

  it("fails clearly on provider errors", async () => {
    const fetcher = vi.fn(async () => new Response("unavailable", { status: 503 }));
    const source = createBraveWebSearchSource("test-key", fetcher as unknown as typeof fetch);
    await expect(source.search({ query: "gravity" }, new AbortController().signal)).rejects.toThrow("HTTP 503");
  });
});
