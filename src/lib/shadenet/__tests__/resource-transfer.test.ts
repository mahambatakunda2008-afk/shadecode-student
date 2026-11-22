import { describe, expect, it } from "vitest";
import { acceptChunk, createTransfer, isComplete, orderedChunks, sha256Hex, verifyResource, verifyTransfer } from "../resource-transfer";
import type { ResourceChunk } from "../protocol";

describe("ShadeNet resource transfer", () => {
  it("reassembles chunks in order and rejects incomplete transfers", async () => {
    const request = { protocol: 1 as const, requestId: "r1", resourceId: "resource-1" };
    const state = createTransfer(request);
    const first = new TextEncoder().encode("hello ").buffer;
    const second = new TextEncoder().encode("world").buffer;
    const chunk = async (index: number, data: ArrayBuffer): Promise<ResourceChunk> => ({
      protocol: 1,
      requestId: "r1",
      resourceId: "resource-1",
      index,
      total: 2,
      data,
      sha256: await sha256Hex(data),
    });

    acceptChunk(state, await chunk(1, second));
    expect(isComplete(state)).toBe(false);
    acceptChunk(state, await chunk(0, first));
    expect(isComplete(state)).toBe(true);
    expect(new TextDecoder().decode(new Uint8Array(orderedChunks(state)[0]))).toBe("hello ");
    expect(new TextDecoder().decode(new Uint8Array(orderedChunks(state)[1]))).toBe("world");
  });

  it("verifies the final content hash", async () => {
    const data = new TextEncoder().encode("shadecode").buffer;
    const digest = await crypto.subtle.digest("SHA-256", data);
    const expected = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    expect(await verifyResource(data, expected)).toBe(true);
    expect(await verifyResource(data, "00".repeat(32))).toBe(false);
  });
  it("rejects a chunk whose persisted digest does not match its bytes", async () => {
    const request = { protocol: 1 as const, requestId: "r2", resourceId: "resource-2" };
    const state = createTransfer(request);
    const data = new TextEncoder().encode("tampered").buffer;
    acceptChunk(state, {
      protocol: 1, requestId: "r2", resourceId: "resource-2",
      index: 0, total: 1, data, sha256: "00".repeat(32),
    });
    const actualResourceHash = await sha256Hex(data);
    expect(await verifyTransfer(state, actualResourceHash)).toBe(false);
  });

  it("rejects conflicting duplicate chunks and changing chunk totals", async () => {
    const request = { protocol: 1 as const, requestId: "r3", resourceId: "resource-3" };
    const state = createTransfer(request);
    const first = new TextEncoder().encode("first").buffer;
    const other = new TextEncoder().encode("other").buffer;
    const firstHash = await sha256Hex(first);
    const otherHash = await sha256Hex(other);
    acceptChunk(state, {
      protocol: 1, requestId: "r3", resourceId: "resource-3",
      index: 0, total: 2, data: first, sha256: firstHash,
    });
    expect(() => acceptChunk(state, {
      protocol: 1, requestId: "r3", resourceId: "resource-3",
      index: 0, total: 2, data: other, sha256: otherHash,
    })).toThrow("Conflicting duplicate");
    expect(() => acceptChunk(state, {
      protocol: 1, requestId: "r3", resourceId: "resource-3",
      index: 1, total: 3, data: other, sha256: otherHash,
    })).toThrow("chunk count changed");
  });

  it("rejects chunk coordinates beyond the protocol limit", () => {
    const request = { protocol: 1 as const, requestId: "r4", resourceId: "resource-4" };
    const state = createTransfer(request);
    expect(() => acceptChunk(state, {
      protocol: 1, requestId: "r4", resourceId: "resource-4",
      index: 0, total: 10_001, data: new Uint8Array([1]).buffer, sha256: "00".repeat(32),
    })).toThrow("Invalid resource chunk coordinates");
  });

});
