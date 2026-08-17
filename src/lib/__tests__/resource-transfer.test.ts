import { describe, expect, it } from 'vitest';
import { contentId } from '../distributed/resource';
import { ResourceAssembler, createTransferPlan } from '../distributed/resource-transfer';

describe('resource transfer', () => {
  it('creates a bounded resume request', () => {
    const plan = createTransferPlan({
      contentId: 'a'.repeat(64),
      kind: 'lesson',
      mimeType: 'text/plain',
      byteLength: 100,
      version: '1',
      verification: 'verified',
    }, 40, 32);

    expect(plan).toEqual({ contentId: 'a'.repeat(64), offset: 40, length: 32 });
  });

  it('detects gaps and assembles chunks in any arrival order', async () => {
    const source = new TextEncoder().encode('Shadecode distributed learning');
    const id = await contentId(source);
    const manifest = {
      contentId: id,
      kind: 'lesson' as const,
      mimeType: 'text/plain',
      byteLength: source.byteLength,
      version: '1',
      verification: 'verified' as const,
    };
    const assembler = new ResourceAssembler(manifest);
    const split = 10;

    assembler.addChunk({
      contentId: id,
      offset: split,
      totalLength: source.byteLength,
      payload: source.slice(split).buffer as ArrayBuffer,
      finalChunk: true,
    });
    expect(assembler.isComplete()).toBe(false);
    expect(assembler.getMissingRanges()).toEqual([{ offset: 0, length: split }]);

    assembler.addChunk({
      contentId: id,
      offset: 0,
      totalLength: source.byteLength,
      payload: source.slice(0, split).buffer as ArrayBuffer,
      finalChunk: false,
    });

    expect(assembler.isComplete()).toBe(true);
    const result = await assembler.finalize();
    expect(new TextDecoder().decode(result)).toBe('Shadecode distributed learning');
  });

  it('rejects overlapping chunks', () => {
    const assembler = new ResourceAssembler({
      contentId: 'a'.repeat(64),
      kind: 'lesson',
      mimeType: 'text/plain',
      byteLength: 10,
      version: '1',
      verification: 'verified',
    });

    assembler.addChunk({
      contentId: 'a'.repeat(64),
      offset: 0,
      totalLength: 10,
      payload: new Uint8Array(6).buffer,
      finalChunk: false,
    });

    expect(() => assembler.addChunk({
      contentId: 'a'.repeat(64),
      offset: 5,
      totalLength: 10,
      payload: new Uint8Array(5).buffer,
      finalChunk: true,
    })).toThrow('Overlapping resource chunk');
  });
});
