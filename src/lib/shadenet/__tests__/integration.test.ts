import { describe, expect, it } from "vitest";
import { ShadeNetResourceClient } from "../client";
import { createInMemoryResourcePeers } from "../testing";
import type { ResourceRequest } from "../protocol";

describe("ShadeNet integration", () => {
  it("retrieves, verifies and caches a peer resource", async () => {
    const payload = new TextEncoder().encode("Cambridge Physics lesson").buffer;
    const hashBytes = await crypto.subtle.digest("SHA-256", payload);
    const hash = Array.from(new Uint8Array(hashBytes), (b) => b.toString(16).padStart(2, "0")).join("");
    const cache = new Map<string, ArrayBuffer>();
    const source = createInMemoryResourcePeers({ lesson: payload }, 8);
    const client = new ShadeNetResourceClient(
      { get: async (id) => cache.get(id) ?? null, put: async (id, data) => void cache.set(id, data) },
      { find: () => [source] },
    );
    const request: ResourceRequest = { protocol: 1, requestId: "integration-1", resourceId: "lesson" };
    const result = await client.get(request, hash);
    expect(new TextDecoder().decode(result!)).toBe("Cambridge Physics lesson");
    expect(cache.has("lesson")).toBe(true);
  });
});
