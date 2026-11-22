import { describe, expect, it } from "vitest";
import {
  acceptChunk,
  createTransfer,
  isComplete,
  orderedChunks,
  sha256Hex,
  verifyTransfer,
} from "./resource-transfer";
import { SHADENET_PROTOCOL } from "./protocol";

function buffer(value: string): ArrayBuffer {
  return new TextEncoder().encode(value).buffer as ArrayBuffer;
}

function request() {
  return { protocol: SHADENET_PROTOCOL, requestId: "request-1", resourceId: "resource-1" } as const;
}

describe("ShadeNet resource transfer integrity", () => {
  it("accepts out-of-order chunks and verifies each chunk plus the complete resource", async () => {
    const first = buffer("offline ");
    const second = buffer("learning");
    const whole = buffer("offline learning");
    const state = createTransfer(request());

    acceptChunk(state, {
      ...request(), index: 1, total: 2, data: second, sha256: await sha256Hex(second),
    });
    acceptChunk(state, {
      ...request(), index: 0, total: 2, data: first, sha256: await sha256Hex(first),
    });

    expect(isComplete(state)).toBe(true);
    expect(new TextDecoder().decode(new Uint8Array(orderedChunks(state)[0]))).toBe("offline ");
    expect(await verifyTransfer(state, await sha256Hex(whole))).toBe(true);
  });

  it("rejects a changed chunk count and conflicting duplicate chunks", async () => {
    const data = buffer("chunk");
    const hash = await sha256Hex(data);
    const state = createTransfer(request());
    const chunk = { ...request(), index: 0, total: 2, data, sha256: hash };
    acceptChunk(state, chunk);
    expect(() => acceptChunk(state, { ...chunk, total: 3 })).toThrow(/count changed/);
    expect(() => acceptChunk(state, { ...chunk, sha256: "0".repeat(64) })).toThrow(/Conflicting duplicate/);
  });

  it("rejects malformed chunk identity, coordinates, payloads and hashes", () => {
    const state = createTransfer(request());
    const valid = { ...request(), index: 0, total: 1, data: buffer("x"), sha256: "a".repeat(64) };
    expect(() => acceptChunk(state, { ...valid, requestId: "other" })).toThrow(/does not belong/);
    expect(() => acceptChunk(state, { ...valid, index: 1 })).toThrow(/coordinates/);
    expect(() => acceptChunk(state, { ...valid, data: new ArrayBuffer(0) })).toThrow(/empty/);
    expect(() => acceptChunk(state, { ...valid, sha256: "bad" })).toThrow(/hash is invalid/);
  });

  it("does not verify corrupted chunks or an incorrect final resource hash", async () => {
    const data = buffer("original");
    const state = createTransfer(request());
    acceptChunk(state, { ...request(), index: 0, total: 1, data, sha256: await sha256Hex(data) });
    expect(await verifyTransfer(state, await sha256Hex(buffer("different")))).toBe(false);
    state.chunks.set(0, buffer("tampered"));
    expect(await verifyTransfer(state, await sha256Hex(data))).toBe(false);
  });
});
