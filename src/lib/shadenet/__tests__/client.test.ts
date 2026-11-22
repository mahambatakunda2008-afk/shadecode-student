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
  it("resumes a previously staged partial transfer and clears it after verification", async () => {
    const first = new TextEncoder().encode("offline ").buffer;
    const second = new TextEncoder().encode("student").buffer;
    const whole = new TextEncoder().encode("offline student").buffer;
    const expected = await digest(whole);
    const firstHash = await digest(first);
    const secondHash = await digest(second);
    const request: ResourceRequest = { protocol: 1, requestId: "new-session", resourceId: "resource-resume" };
    const staged = [{
      index: 0, total: 2, data: first, sha256: firstHash, savedAt: Date.now(),
    }];
    let cleared = false;
    const persistence = {
      list: async () => staged,
      save: async () => undefined,
      clear: async () => { cleared = true; },
    };
    const cache = new Map<string, ArrayBuffer>();
    const cacheAdapter: ResourceCache = {
      get: async (id) => cache.get(id) ?? null,
      put: async (id, value) => { cache.set(id, value); },
    };
    const discovery: ResourceDiscovery = {
      find: () => [{
        peerId: "peer-resume",
        request: async function* () {
          yield {
            protocol: 1, requestId: request.requestId, resourceId: request.resourceId,
            index: 1, total: 2, data: second, sha256: secondHash,
          };
        },
      }],
    };

    const client = new ShadeNetResourceClient(cacheAdapter, discovery, persistence);
    const result = await client.get(request, expected);
    expect(new TextDecoder().decode(result!)).toBe("offline student");
    expect(cleared).toBe(true);
  });
  it("finalizes a fully staged transfer offline without contacting a peer", async () => {
    const data = new TextEncoder().encode("already downloaded").buffer;
    const expected = await digest(data);
    const request: ResourceRequest = { protocol: 1, requestId: "new-session", resourceId: "resource-complete" };
    let discoveryCalled = false;
    let cleared = false;
    const persistence = {
      list: async () => [{
        index: 0, total: 1, data, sha256: expected, savedAt: Date.now(),
      }],
      save: async () => undefined,
      clear: async () => { cleared = true; },
    };
    const cache = new Map<string, ArrayBuffer>();
    const cacheAdapter: ResourceCache = {
      get: async (id) => cache.get(id) ?? null,
      put: async (id, value) => { cache.set(id, value); },
    };
    const discovery: ResourceDiscovery = {
      find: () => { discoveryCalled = true; return []; },
    };

    const client = new ShadeNetResourceClient(cacheAdapter, discovery, persistence);
    const result = await client.get(request, expected);
    expect(new TextDecoder().decode(result!)).toBe("already downloaded");
    expect(discoveryCalled).toBe(false);
    expect(cleared).toBe(true);
  });


});
