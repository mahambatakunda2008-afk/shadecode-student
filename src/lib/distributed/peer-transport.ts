import { contentId, type ResourceManifest } from './resource';
import {
  isRequestFresh,
  type ResourceRequest,
  type ResourceResponse,
} from './protocol';
import { ResourceAssembler, type ResourceChunk } from './resource-transfer';

export interface PeerResourceProvider {
  getResource(contentId: string, offset: number, length: number): Promise<ArrayBuffer | undefined>;
  getManifest(contentId: string): Promise<ResourceManifest | undefined>;
}

export interface PeerTransport {
  requestResource(request: ResourceRequest): Promise<ResourceResponse>;
}

/** In-memory transport for deterministic tests and local development. */
export class InMemoryPeerTransport implements PeerTransport {
  constructor(
    private readonly provider: PeerResourceProvider,
    private readonly now: () => number = Date.now,
  ) {}

  async requestResource(request: ResourceRequest): Promise<ResourceResponse> {
    if (!isRequestFresh(request, this.now())) {
      throw new Error('Stale or malformed resource request');
    }

    const manifest = await this.provider.getManifest(request.contentId);
    if (!manifest) throw new Error('Resource not found');
    if (request.offset + request.length > manifest.byteLength) {
      throw new Error('Requested resource range is outside manifest bounds');
    }

    const payload = await this.provider.getResource(
      request.contentId,
      request.offset,
      request.length,
    );
    if (!payload) throw new Error('Resource payload not available');

    return {
      protocolVersion: 1,
      requestId: request.requestId,
      senderNodeId: 'in-memory-peer',
      contentId: request.contentId,
      offset: request.offset,
      totalLength: manifest.byteLength,
      payload,
      finalChunk: request.offset + payload.byteLength >= manifest.byteLength,
    };
  }
}

export async function exchangeResource(
  manifest: ResourceManifest,
  transport: PeerTransport,
  createRequest: (offset: number, length: number) => ResourceRequest,
  chunkSize = 64 * 1024,
): Promise<ArrayBuffer> {
  if (!Number.isInteger(chunkSize) || chunkSize <= 0 || chunkSize > 4 * 1024 * 1024) {
    throw new Error('Invalid transfer chunk size');
  }

  const assembler = new ResourceAssembler(manifest);

  while (!assembler.isComplete()) {
    const missing = assembler.getMissingRanges()[0];
    if (!missing) break;
    const before = assembler.getReceivedBytes();
    const length = Math.min(chunkSize, missing.length);
    const response = await transport.requestResource(createRequest(missing.offset, length));

    const chunk: ResourceChunk = {
      contentId: response.contentId,
      offset: response.offset,
      totalLength: response.totalLength,
      payload: response.payload,
      finalChunk: response.finalChunk,
    };
    assembler.addChunk(chunk);
    if (assembler.getReceivedBytes() === before) {
      throw new Error('Peer transfer made no progress');
    }
  }

  const result = await assembler.finalize();
  const actual = await contentId(result);
  if (actual !== manifest.contentId) {
    throw new Error('Peer resource integrity check failed');
  }
  return result;
}
