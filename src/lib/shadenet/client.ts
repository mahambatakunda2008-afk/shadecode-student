import { acceptChunk, createTransfer, isComplete, orderedChunks, verifyResource, verifyTransfer, type TransferState } from "./resource-transfer";
import { canShare, type ResourcePolicy } from "./resource-policy";
import type { ResourceChunk, ResourceRequest } from "./protocol";
import { shadeNetTransferStore, type PersistedTransferChunk } from "./transfer-store";

export interface ResourceSource {
  peerId: string;
  request(request: ResourceRequest): AsyncIterable<ResourceChunk>;
}

export interface ResourceCache {
  get(resourceId: string): Promise<ArrayBuffer | null>;
  put(resourceId: string, data: ArrayBuffer): Promise<void>;
}

export interface ResourceDiscovery {
  find(resourceId: string): ResourceSource[];
}

export interface TransferPersistence {
  list(resourceId: string, expectedSha256: string): Promise<PersistedTransferChunk[]>;
  save(resourceId: string, expectedSha256: string, chunk: ResourceChunk): Promise<void>;
  clear(resourceId: string, expectedSha256: string): Promise<void>;
}

export class ShadeNetResourceClient {
  constructor(
    private readonly cache: ResourceCache,
    private readonly discovery: ResourceDiscovery,
    private readonly transferStore: TransferPersistence | null = shadeNetTransferStore,
  ) {}

  async get(request: ResourceRequest, expectedSha256: string): Promise<ArrayBuffer | null> {
    const cached = await this.cache.get(request.resourceId);
    if (cached && await verifyResource(cached, expectedSha256)) {
      await this.transferStore?.clear(request.resourceId, expectedSha256).catch(() => undefined);
      return cached;
    }

    let state: TransferState = createTransfer(request);
    if (this.transferStore) {
      try {
        const saved = await this.transferStore.list(request.resourceId, expectedSha256);
        for (const chunk of saved) {
          state = acceptChunk(state, {
            protocol: request.protocol,
            requestId: request.requestId,
            resourceId: request.resourceId,
            index: chunk.index,
            total: chunk.total,
            data: chunk.data,
            sha256: chunk.sha256,
          });
        }
      } catch {
        await this.transferStore.clear(request.resourceId, expectedSha256).catch(() => undefined);
        state = createTransfer(request);
      }
    }

    for (const source of this.discovery.find(request.resourceId)) {
      try {
        for await (const chunk of source.request(request)) {
          state = acceptChunk(state, chunk);
          await this.transferStore?.save(request.resourceId, expectedSha256, chunk).catch(() => undefined);
        }
        if (!isComplete(state) || !(await verifyTransfer(state, expectedSha256))) continue;
        const parts = orderedChunks(state);
        const totalBytes = parts.reduce((sum, part) => sum + part.byteLength, 0);
        const data = new Uint8Array(totalBytes);
        let offset = 0;
        for (const part of parts) {
          data.set(new Uint8Array(part), offset);
          offset += part.byteLength;
        }
        if (!(await verifyResource(data.buffer, expectedSha256))) continue;
        await this.cache.put(request.resourceId, data.buffer);
        await this.transferStore?.clear(request.resourceId, expectedSha256).catch(() => undefined);
        return data.buffer;
      } catch {
        // A peer is untrusted transport. Try the next advertised source.
      }
    }
    return null;
  }
}

export function mayAdvertiseResource(policy: ResourcePolicy, visibility: "private" | "peer" | "public"): boolean {
  return canShare(policy, visibility);
}
