import { acceptChunk, createTransfer, isComplete, orderedChunks, verifyResource, type TransferState } from "./resource-transfer";
import { canShare, type ResourcePolicy } from "./resource-policy";
import type { ResourceChunk, ResourceRequest } from "./protocol";

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

export class ShadeNetResourceClient {
  constructor(private readonly cache: ResourceCache, private readonly discovery: ResourceDiscovery) {}

  async get(request: ResourceRequest, expectedSha256: string): Promise<ArrayBuffer | null> {
    const cached = await this.cache.get(request.resourceId);
    if (cached && await verifyResource(cached, expectedSha256)) return cached;

    for (const source of this.discovery.find(request.resourceId)) {
      let state: TransferState = createTransfer(request);
      try {
        for await (const chunk of source.request(request)) {
          state = acceptChunk(state, chunk);
        }
        if (!isComplete(state)) continue;
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
