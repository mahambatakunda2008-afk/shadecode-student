import { describe, expect, it } from 'vitest';
import { contentId } from '../distributed/resource';
import { InMemoryPeerTransport, exchangeResource, type PeerResourceProvider } from '../distributed/peer-transport';

function requestFactory(contentIdValue: string) {
  return (offset: number, length: number) => ({
    protocolVersion: 1 as const,
    requestId: `request-${offset}`,
    senderNodeId: 'student-node',
    contentId: contentIdValue,
    offset,
    length,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 10_000,
    nonce: `nonce-${offset}-123456`,
  });
}

describe('peer resource exchange', () => {
  it('exchanges a resource through a transport without cloud state', async () => {
    const source = new TextEncoder().encode('resource from peer A to peer B');
    const id = await contentId(source);
    const manifest = {
      contentId: id,
      kind: 'lesson' as const,
      mimeType: 'text/plain',
      byteLength: source.byteLength,
      version: '1',
      verification: 'verified' as const,
    };
    const provider: PeerResourceProvider = {
      getManifest: async (contentIdValue) => contentIdValue === id ? manifest : undefined,
      getResource: async (contentIdValue, offset, length) => {
        if (contentIdValue !== id) return undefined;
        return source.slice(offset, offset + length).buffer as ArrayBuffer;
      },
    };

    const transport = new InMemoryPeerTransport(provider);
    const result = await exchangeResource(manifest, transport, requestFactory(id), 7);

    expect(new TextDecoder().decode(result)).toBe('resource from peer A to peer B');
  });
});
