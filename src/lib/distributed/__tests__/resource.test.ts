import { describe, expect, it } from "vitest";
import { assertResourceIntegrity, contentId, isResourceShareable } from "../resource";

describe("distributed resources", () => {
  it("creates a stable SHA-256 content identifier", async () => {
    const first = await contentId(new Uint8Array([1, 2, 3]));
    const second = await contentId(new Uint8Array([1, 2, 3]));
    const different = await contentId(new Uint8Array([1, 2, 4]));

    expect(first).toHaveLength(64);
    expect(second).toBe(first);
    expect(different).not.toBe(first);
  });

  it("rejects unverified resources from sharing", () => {
    const base = {
      contentId: "a".repeat(64),
      kind: "lesson" as const,
      mimeType: "text/plain",
      byteLength: 3,
      version: "1",
    };

    expect(isResourceShareable({ ...base, verification: "verified" })).toBe(true);
    expect(isResourceShareable({ ...base, verification: "unverified" })).toBe(false);
  });

  it("detects content identity mismatches", () => {
    const manifest = {
      contentId: "a".repeat(64),
      kind: "lesson" as const,
      mimeType: "text/plain",
      byteLength: 3,
      version: "1",
      verification: "verified" as const,
    };

    expect(() => assertResourceIntegrity(manifest, manifest.contentId)).not.toThrow();
    expect(() => assertResourceIntegrity(manifest, "b".repeat(64))).toThrow(/integrity/i);
  });
});
