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
});
