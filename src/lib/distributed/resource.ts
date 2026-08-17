export type ResourceKind = 'lesson' | 'question-set' | 'past-paper' | 'model' | 'media' | 'index' | 'other';

export interface ResourceManifest {
  contentId: string;
  kind: ResourceKind;
  mimeType: string;
  byteLength: number;
  version: string;
  title?: string;
  subject?: string;
  qualification?: string;
  syllabus?: string;
  source?: string;
  license?: string;
  signature?: string;
  verification: 'official' | 'verified' | 'community' | 'ai-generated' | 'unverified';
}

const HEX = /^[0-9a-f]+$/i;

/** SHA-256 content identifier. The digest is the identity, not a mutable URL. */
export async function contentId(data: ArrayBuffer | Uint8Array): Promise<string> {
  const source = data instanceof Uint8Array ? data : new Uint8Array(data);
  // Copy into a fresh ArrayBuffer. This keeps the Web Crypto call compatible with
  // Node 24's stricter BufferSource typings when the input is backed by a
  // SharedArrayBuffer-compatible Uint8Array.
  const bytes = new Uint8Array(source.byteLength);
  bytes.set(source);
  const digest = await crypto.subtle.digest('SHA-256', bytes.buffer);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
}

export function isValidContentId(value: string): boolean {
  return value.length === 64 && HEX.test(value);
}

export function isResourceShareable(manifest: ResourceManifest): boolean {
  if (!manifest.contentId || !isValidContentId(manifest.contentId)) return false;
  if (manifest.byteLength < 0) return false;
  if (!manifest.mimeType || !manifest.version) return false;
  return manifest.verification !== 'unverified';
}

export function assertResourceIntegrity(manifest: ResourceManifest, actualContentId: string): void {
  if (!isValidContentId(actualContentId)) {
    throw new Error('Invalid resource content identifier');
  }
  if (manifest.contentId !== actualContentId) {
    throw new Error('Resource integrity check failed');
  }
}
