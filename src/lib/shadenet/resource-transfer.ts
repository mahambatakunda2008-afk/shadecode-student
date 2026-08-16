import type { ResourceChunk, ResourceRequest, ResourceTransferComplete } from "./protocol";

export interface TransferState {
  request: ResourceRequest;
  received: number;
  total: number | null;
  chunks: Map<number, ArrayBuffer>;
  hashes: Map<number, string>;
}

export function createTransfer(request: ResourceRequest): TransferState {
  return { request, received: 0, total: null, chunks: new Map(), hashes: new Map() };
}

export function acceptChunk(state: TransferState, chunk: ResourceChunk): TransferState {
  if (chunk.protocol !== state.request.protocol) throw new Error("Unsupported ShadeNet protocol version");
  if (chunk.requestId !== state.request.requestId || chunk.resourceId !== state.request.resourceId) {
    throw new Error("Resource chunk does not belong to this transfer");
  }
  if (!Number.isInteger(chunk.index) || chunk.index < 0 || !Number.isInteger(chunk.total) || chunk.total <= 0 || chunk.index >= chunk.total) {
    throw new Error("Invalid resource chunk coordinates");
  }
  if (!state.chunks.has(chunk.index)) state.received += 1;
  state.total = chunk.total;
  state.chunks.set(chunk.index, chunk.data);
  state.hashes.set(chunk.index, chunk.sha256);
  return state;
}

export function isComplete(state: TransferState): boolean {
  return state.total !== null && state.received === state.total;
}

export function orderedChunks(state: TransferState): ArrayBuffer[] {
  if (!isComplete(state)) throw new Error("Resource transfer is incomplete");
  return Array.from({ length: state.total! }, (_, index) => {
    const chunk = state.chunks.get(index);
    if (!chunk) throw new Error("Missing resource chunk");
    return chunk;
  });
}

export function completeMessage(state: TransferState, sha256: string): ResourceTransferComplete {
  if (!isComplete(state)) throw new Error("Cannot complete an incomplete transfer");
  return {
    protocol: state.request.protocol,
    requestId: state.request.requestId,
    resourceId: state.request.resourceId,
    sha256,
  };
}

export async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyResource(data: ArrayBuffer, expectedSha256: string): Promise<boolean> {
  return (await sha256Hex(data)).toLowerCase() === expectedSha256.toLowerCase();
}
