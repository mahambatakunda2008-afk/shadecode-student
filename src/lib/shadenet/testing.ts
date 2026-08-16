import type { ResourceChunk, ResourceRequest } from "./protocol";
import type { ResourceSource } from "./client";

export function createInMemoryResourcePeers(resources: Record<string, ArrayBuffer>, chunkBytes = 32 * 1024): ResourceSource {
  return {
    peerId: "in-memory-peer",
    async *request(request: ResourceRequest): AsyncIterable<ResourceChunk> {
      const data = resources[request.resourceId];
      if (!data) return;
      const total = Math.max(1, Math.ceil(data.byteLength / chunkBytes));
      const digest = await crypto.subtle.digest("SHA-256", data);
      const sha256 = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
      for (let index = 0; index < total; index += 1) {
        const start = index * chunkBytes;
        yield {
          protocol: request.protocol,
          requestId: request.requestId,
          resourceId: request.resourceId,
          index,
          total,
          data: data.slice(start, Math.min(start + chunkBytes, data.byteLength)),
          sha256,
        };
      }
    },
  };
}
