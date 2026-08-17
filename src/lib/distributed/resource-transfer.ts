import { assertResourceIntegrity, contentId, type ResourceManifest } from './resource';

export interface ResourceChunk {
  contentId: string;
  offset: number;
  totalLength: number;
  payload: ArrayBuffer;
  finalChunk: boolean;
}

export interface TransferPlan {
  contentId: string;
  offset: number;
  length: number;
}

const DEFAULT_CHUNK_SIZE = 64 * 1024;

export function createTransferPlan(
  manifest: ResourceManifest,
  offset = 0,
  chunkSize = DEFAULT_CHUNK_SIZE,
): TransferPlan {
  if (!Number.isInteger(offset) || offset < 0 || offset > manifest.byteLength) {
    throw new Error('Invalid transfer offset');
  }
  if (!Number.isInteger(chunkSize) || chunkSize <= 0 || chunkSize > 4 * 1024 * 1024) {
    throw new Error('Invalid transfer chunk size');
  }
  return {
    contentId: manifest.contentId,
    offset,
    length: Math.min(chunkSize, manifest.byteLength - offset),
  };
}

export class ResourceAssembler {
  private readonly chunks = new Map<number, ArrayBuffer>();
  private receivedBytes = 0;

  constructor(
    private readonly manifest: ResourceManifest,
  ) {}

  addChunk(chunk: ResourceChunk): void {
    if (chunk.contentId !== this.manifest.contentId) {
      throw new Error('Chunk belongs to a different resource');
    }
    if (chunk.totalLength !== this.manifest.byteLength) {
      throw new Error('Chunk length does not match resource manifest');
    }
    if (chunk.offset < 0 || chunk.offset + chunk.payload.byteLength > chunk.totalLength) {
      throw new Error('Chunk is outside resource bounds');
    }
    if (chunk.payload.byteLength === 0) {
      throw new Error('Empty chunks are not valid');
    }
    if (this.chunks.has(chunk.offset)) return;

    // Reject overlaps instead of silently choosing one source of bytes.
    for (const [existingOffset, existing] of this.chunks) {
      const existingEnd = existingOffset + existing.byteLength;
      const incomingEnd = chunk.offset + chunk.payload.byteLength;
      if (chunk.offset < existingEnd && existingOffset < incomingEnd) {
        throw new Error('Overlapping resource chunk');
      }
    }

    this.chunks.set(chunk.offset, chunk.payload.slice(0));
    this.receivedBytes += chunk.payload.byteLength;
  }

  getReceivedBytes(): number {
    return this.receivedBytes;
  }

  getMissingRanges(): Array<{ offset: number; length: number }> {
    const ranges: Array<{ offset: number; length: number }> = [];
    let cursor = 0;
    for (const [offset, payload] of [...this.chunks.entries()].sort(([a], [b]) => a - b)) {
      if (offset > cursor) ranges.push({ offset: cursor, length: offset - cursor });
      cursor = Math.max(cursor, offset + payload.byteLength);
    }
    if (cursor < this.manifest.byteLength) {
      ranges.push({ offset: cursor, length: this.manifest.byteLength - cursor });
    }
    return ranges;
  }

  isComplete(): boolean {
    return this.receivedBytes === this.manifest.byteLength && this.getMissingRanges().length === 0;
  }

  async finalize(): Promise<ArrayBuffer> {
    if (!this.isComplete()) {
      throw new Error('Resource transfer is incomplete');
    }

    const output = new Uint8Array(this.manifest.byteLength);
    for (const [offset, payload] of this.chunks) {
      output.set(new Uint8Array(payload), offset);
    }

    const actualContentId = await contentId(output);
    assertResourceIntegrity(this.manifest, actualContentId);
    return output.buffer as ArrayBuffer;
  }
}
