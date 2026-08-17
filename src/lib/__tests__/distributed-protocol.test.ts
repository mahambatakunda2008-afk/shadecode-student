import { describe, expect, it } from 'vitest';
import {
  createNodeAdvertisement,
  createNodeIdentity,
  isRequestFresh,
  verifyNodeAdvertisement,
} from '../distributed/protocol';
import type { NodeCapabilities } from '../distributed/node';

const node: NodeCapabilities = {
  nodeId: 'node-1',
  kind: 'browser',
  cpuClass: 1,
  gpuClass: 0,
  npuClass: 0,
  memoryClassMb: 1024,
  storageQuotaMb: 128,
  network: 'wifi',
  batteryPolicy: 'charging-only',
  modelIds: [],
  trust: 'trusted',
  lastSeenAt: Date.now(),
};

describe('ShadeNet protocol', () => {
  it('creates and verifies a signed node advertisement', async () => {
    const keyPair = await createNodeIdentity();
    const advertisement = await createNodeAdvertisement(node, keyPair);

    expect(await verifyNodeAdvertisement(advertisement)).toBe(true);
    expect(await verifyNodeAdvertisement({
      ...advertisement,
      node: { ...node, nodeId: 'tampered' },
    })).toBe(false);
  });

  it('rejects expired advertisements', async () => {
    const keyPair = await createNodeIdentity();
    const advertisement = await createNodeAdvertisement(node, keyPair, 1000);
    expect(await verifyNodeAdvertisement(advertisement, advertisement.expiresAt)).toBe(false);
  });

  it('checks resource request freshness and replay window metadata', () => {
    const now = Date.now();
    expect(isRequestFresh({
      protocolVersion: 1,
      requestId: 'request-1',
      senderNodeId: 'node-1',
      contentId: 'a'.repeat(64),
      offset: 0,
      length: 1024,
      issuedAt: now - 1000,
      expiresAt: now + 5000,
      nonce: '1234567890123456',
    }, now)).toBe(true);

    expect(isRequestFresh({
      protocolVersion: 1,
      requestId: 'request-1',
      senderNodeId: 'node-1',
      contentId: 'a'.repeat(64),
      offset: 0,
      length: 1024,
      issuedAt: now - 10000,
      expiresAt: now - 1,
      nonce: '1234567890123456',
    }, now)).toBe(false);
  });
});
