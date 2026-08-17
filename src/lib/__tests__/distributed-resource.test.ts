import { describe, expect, it } from 'vitest';
import {
  assertResourceIntegrity,
  contentId,
  isResourceShareable,
  isValidContentId,
} from '../distributed/resource';

const manifest = {
  contentId: 'a'.repeat(64),
  kind: 'lesson' as const,
  mimeType: 'text/plain',
  byteLength: 10,
  version: '1',
  verification: 'verified' as const,
};

describe('distributed resource identity', () => {
  it('produces a SHA-256 content identifier', async () => {
    const id = await contentId(new TextEncoder().encode('shadecode'));
    expect(id).toHaveLength(64);
    expect(isValidContentId(id)).toBe(true);
  });

  it('rejects malformed identifiers', () => {
    expect(isValidContentId('not-a-hash')).toBe(false);
    expect(isValidContentId('g'.repeat(64))).toBe(false);
  });

  it('does not mark unverified resources as shareable', () => {
    expect(isResourceShareable({ ...manifest, verification: 'unverified' })).toBe(false);
    expect(isResourceShareable(manifest)).toBe(true);
  });

  it('detects content substitution', () => {
    expect(() => assertResourceIntegrity(manifest, 'b'.repeat(64))).toThrow(
      'Resource integrity check failed',
    );
  });
});
