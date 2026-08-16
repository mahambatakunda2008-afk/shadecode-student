import { describe, expect, it } from "vitest";
import { ShadeNetResourceClient, type ResourceCache, type ResourceDiscovery } from "../client";
import type { ResourceChunk, ResourceRequest } from "../protocol";

const digest = async (data: ArrayBuffer) => {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
};

describe("ShadeNet resource client", () => {
  it("falls back across peers and caches verified content", async () => {
    const data = new TextEncoder().encode("peer content").buffer;
    const expected = await digest(data);
    const request: ResourceRequest = { protocol: 1, requestId: "r1", resourceId: "resource-1" };
    const chunk: ResourceChunk = { protocol: 1, requestId: "r1", resourceId: "resource-1", index: 0, total: 1, data, sha256: expected };
    const cache = new Map<string, ArrayBuffer>();
    const cacheAdapter: ResourceCache = { get: async (id) => cache.get(id) ?? null, put: async (id, value) => void cache.set(id, value) };
    let calls = 0;
    const discovery: ResourceDiscovery = { find: () => [
      { peerId: "bad", request: async function* () { calls++; yield { ...chunk, data: new TextEncoder().encode("bad").buffer }; } },
      { peerId: "good", request: async function* () { calls++; yield chunk; } },
    ] };

    const client = new ShadeNetResourceClient(cacheAdapter, discovery);
    const result = await client.get(request, expected);
    expect(new TextDecoder().decode(result!)).toBe("peer content");
    expect(calls).toBe(2);
    expect(cache.has("resource-1")).toBe(true);
  });
});
