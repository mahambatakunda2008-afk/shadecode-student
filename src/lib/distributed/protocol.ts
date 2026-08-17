import type { NodeCapabilities } from './node';

export interface NodeAdvertisement {
  protocolVersion: 1;
  node: NodeCapabilities;
  publicKeyJwk: JsonWebKey;
  issuedAt: number;
  expiresAt: number;
  signature: string;
}

export interface ResourceRequest {
  protocolVersion: 1;
  requestId: string;
  senderNodeId: string;
  contentId: string;
  offset: number;
  length: number;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

export interface ResourceResponse {
  protocolVersion: 1;
  requestId: string;
  senderNodeId: string;
  contentId: string;
  offset: number;
  totalLength: number;
  payload: ArrayBuffer;
  finalChunk: boolean;
}

const encoder = new TextEncoder();

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalize(entry)}`);
  return `{${entries.join(',')}}`;
}

function bytesToBase64(bytes: ArrayBuffer): string {
  const data = new Uint8Array(bytes);
  let binary = '';
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): ArrayBuffer {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function advertisementPayload(advertisement: Omit<NodeAdvertisement, 'signature'>): ArrayBuffer {
  return encoder.encode(canonicalize(advertisement)).buffer;
}

export async function createNodeIdentity(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  ) as Promise<CryptoKeyPair>;
}

export async function createNodeAdvertisement(
  node: NodeCapabilities,
  keyPair: CryptoKeyPair,
  ttlMs = 5 * 60 * 1000,
): Promise<NodeAdvertisement> {
  if (ttlMs <= 0 || ttlMs > 60 * 60 * 1000) {
    throw new Error('Invalid node advertisement lifetime');
  }
  const issuedAt = Date.now();
  const unsigned: Omit<NodeAdvertisement, 'signature'> = {
    protocolVersion: 1,
    node,
    publicKeyJwk: await crypto.subtle.exportKey('jwk', keyPair.publicKey),
    issuedAt,
    expiresAt: issuedAt + ttlMs,
  };
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    keyPair.privateKey,
    advertisementPayload(unsigned),
  );
  return { ...unsigned, signature: bytesToBase64(signature) };
}

export async function verifyNodeAdvertisement(
  advertisement: NodeAdvertisement,
  now = Date.now(),
): Promise<boolean> {
  if (advertisement.protocolVersion !== 1) return false;
  if (advertisement.expiresAt <= now || advertisement.issuedAt > now + 30_000) return false;
  if (advertisement.node.nodeId.length === 0) return false;
  try {
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      advertisement.publicKeyJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );
    const { signature, ...unsigned } = advertisement;
    return crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      base64ToBytes(signature),
      advertisementPayload(unsigned),
    );
  } catch {
    return false;
  }
}

export function isRequestFresh(request: ResourceRequest, now = Date.now()): boolean {
  return request.protocolVersion === 1
    && request.requestId.length > 0
    && request.senderNodeId.length > 0
    && request.contentId.length === 64
    && request.offset >= 0
    && request.length > 0
    && request.expiresAt > now
    && request.issuedAt <= now + 30_000
    && request.nonce.length >= 16;
}
