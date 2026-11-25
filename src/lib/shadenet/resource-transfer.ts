import type { ResourceChunk, ResourceRequest, ResourceTransferComplete } from "./protocol";

export interface TransferState {
  request: ResourceRequest;
  received: number;
  bytesReceived: number;
  total: number | null;
  chunks: Map<number, ArrayBuffer>;
  hashes: Map<number, string>;
}

export function createTransfer(request: ResourceRequest): TransferState {
  return { request, received: 0, bytesReceived: 0, total: null, chunks: new Map(), hashes: new Map() };
}

const MAX_TRANSFER_BYTES = 150 * 1024 * 1024;
const MAX_TRANSFER_CHUNKS = 10000;

export function acceptChunk(state: TransferState, chunk: ResourceChunk): TransferState {
  if (chunk.protocol !== state.request.protocol) throw new Error("Unsupported ShadeNet protocol version");
  if (chunk.requestId !== state.request.requestId || chunk.resourceId !== state.request.resourceId) {
    throw new Error("Resource chunk does not belong to this transfer");
  }
  if (!Number.isSafeInteger(chunk.index) || chunk.index < 0 || !Number.isSafeInteger(chunk.total) || chunk.total <= 0 || chunk.total > MAX_TRANSFER_CHUNKS || chunk.index >= chunk.total) {
    throw new Error("Invalid resource chunk coordinates");
  }
  if (!(chunk.data instanceof ArrayBuffer) || chunk.data.byteLength === 0) {
    throw new Error("Resource chunk payload is empty or invalid");
  }
  if (!/^[a-f0-9]{64}$/i.test(chunk.sha256)) throw new Error("Resource chunk hash is invalid");
  if (state.total !== null && state.total !== chunk.total) throw new Error("Resource chunk count changed during transfer");
  if (state.bytesReceived + chunk.data.byteLength > MAX_TRANSFER_BYTES) throw new Error("Resource transfer exceeds the 150 MB limit");

  const previous = state.chunks.get(chunk.index);
  if (previous) {
    const previousHash = state.hashes.get(chunk.index);
    if (previousHash?.toLowerCase() !== chunk.sha256.toLowerCase() || previous.byteLength !== chunk.data.byteLength) {
      throw new Error("Conflicting duplicate resource chunk");
    }
    return state;
  }

  state.total = chunk.total;
  state.received += 1;
  state.bytesReceived += chunk.data.byteLength;
  state.chunks.set(chunk.index, chunk.data.slice(0));
  state.hashes.set(chunk.index, chunk.sha256.toLowerCase());
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

export async function verifyTransfer(state: TransferState, expectedResourceSha256: string): Promise<boolean> {
  if (!isComplete(state) || !/^[a-f0-9]{64}$/i.test(expectedResourceSha256)) return false;
  const chunks = orderedChunks(state);
  for (let index = 0; index < chunks.length; index += 1) {
    if (await sha256Hex(chunks[index]) !== state.hashes.get(index)) return false;
  }
  const totalBytes = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  }
  return await sha256Hex(combined.buffer) === expectedResourceSha256.toLowerCase();
}

export function completeMessage(state: TransferState, sha256: string): ResourceTransferComplete {
  if (!isComplete(state)) throw new Error("Cannot complete an incomplete transfer");
  if (!/^[a-f0-9]{64}$/i.test(sha256)) throw new Error("Resource hash is invalid");
  return {
    protocol: state.request.protocol,
    requestId: state.request.requestId,
    resourceId: state.request.resourceId,
    sha256: sha256.toLowerCase(),
  };
}

export async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyResource(data: ArrayBuffer, expectedSha256: string): Promise<boolean> {
  return /^[a-f0-9]{64}$/i.test(expectedSha256) &&
    (await sha256Hex(data)).toLowerCase() === expectedSha256.toLowerCase();
}
