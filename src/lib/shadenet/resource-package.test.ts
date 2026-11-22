import { describe, expect, it } from "vitest";
import {
  createResourcePackage,
  ResourcePackageError,
  validateResourcePackage,
  validateResourcePackageManifest,
  serializeResourcePackage,
  parseResourcePackage,
} from "./resource-package";

const baseMetadata = {
  title: "AS Physics: Wave motion",
  mimeType: "application/pdf",
  fileName: "wave-motion.pdf",
  createdAt: "2026-11-22T10:00:00.000Z",
  curriculum: {
    board: "Cambridge International",
    qualification: "AS",
    subject: "Physics",
    subjectCode: "9702",
    syllabusVersion: "2025-2027",
    topic: "Waves",
    objectiveIds: ["3.1"],
  },
  provenance: {
    origin: "local-import" as const,
    originalFileName: "wave-motion.pdf",
    importedAt: "2026-11-22T10:00:00.000Z",
    checksumAlgorithm: "SHA-256" as const,
  },
  review: { status: "unreviewed" as const },
};

describe("versioned Shadecode resource packages", () => {
  it("creates a manifest bound to the exact original payload bytes", async () => {
    const payload = new TextEncoder().encode("%PDF-1.7 sample bytes");
    const resource = await createResourcePackage(baseMetadata, payload);

    expect(resource.manifest.version).toBe(1);
    expect(resource.manifest.format).toBe("shadecode-resource");
    expect(resource.manifest.byteLength).toBe(payload.byteLength);
    expect(resource.manifest.resourceId).toMatch(/^[a-f0-9]{64}$/);
    expect(resource.manifest.payloadSha256).toBe(resource.manifest.resourceId);
    expect(await validateResourcePackage(resource)).toMatchObject({
      manifest: { title: "AS Physics: Wave motion", review: { status: "unreviewed" } },
    });
  });

  it("rejects payload tampering before a resource can be committed", async () => {
    const resource = await createResourcePackage(baseMetadata, new TextEncoder().encode("original"));
    const tampered = { ...resource, payload: new TextEncoder().encode("tampered") };

    await expect(validateResourcePackage(tampered)).rejects.toMatchObject({
      code: "checksum-mismatch",
    });
  });

  it("rejects a same-length payload whose checksum no longer matches", async () => {
    const resource = await createResourcePackage(baseMetadata, new TextEncoder().encode("original"));
    const changed = new TextEncoder().encode("Original");

    await expect(validateResourcePackage({ ...resource, payload: changed })).rejects.toMatchObject({
      code: "checksum-mismatch",
    });
  });

  it("does not allow a source assessment to silently confer official status", () => {
    const manifest = {
      format: "shadecode-resource",
      version: 1,
      resourceId: "a".repeat(64),
      title: "Unreviewed web page",
      mimeType: "text/html",
      fileName: "page.html",
      byteLength: 0,
      payloadSha256: "a".repeat(64),
      createdAt: "2026-11-22T10:00:00.000Z",
      curriculum: { subject: "Physics" },
      provenance: {
        origin: "online-discovery",
        originalUrl: "https://example.org/physics",
        importedAt: "2026-11-22T10:00:00.000Z",
        checksumAlgorithm: "SHA-256",
      },
      review: { status: "official" },
    };

    expect(() => validateResourcePackageManifest(manifest)).toThrow(ResourcePackageError);
    expect(() => validateResourcePackageManifest(manifest)).toThrow(
      "require an identified reviewer",
    );
  });

  it("rejects unsupported versions and non-HTTPS original sources", async () => {
    const resource = await createResourcePackage(baseMetadata, new Uint8Array([1, 2, 3]));
    expect(() => validateResourcePackageManifest({ ...resource.manifest, version: 2 })).toThrow(
      "Unsupported resource package version",
    );
    expect(() =>
      validateResourcePackageManifest({
        ...resource.manifest,
        provenance: { ...resource.manifest.provenance, originalUrl: "http://example.org" },
      }),
    ).toThrow("must use HTTPS");
  });
});


describe("portable resource package envelope", () => {
  it("round-trips metadata and exact original bytes", async () => {
    const payload = new Uint8Array([0, 1, 2, 127, 128, 255]);
    const resource = await createResourcePackage(baseMetadata, payload);
    const encoded = await serializeResourcePackage(resource);
    const decoded = await parseResourcePackage(encoded);

    expect(decoded.manifest).toEqual(resource.manifest);
    expect(decoded.payload).toEqual(payload);
  });

  it("rejects an unknown envelope and truncated metadata", async () => {
    await expect(parseResourcePackage(new TextEncoder().encode("NOTSHADECODE"))).rejects.toMatchObject({
      code: "unsupported-format",
    });
    await expect(parseResourcePackage(new TextEncoder().encode("SCRESOURCE1"))).rejects.toMatchObject({
      code: "invalid-payload",
    });
  });

  it("rejects portable payload tampering after import", async () => {
    const resource = await createResourcePackage(baseMetadata, new TextEncoder().encode("original"));
    const encoded = await serializeResourcePackage(resource);
    encoded[encoded.length - 1] ^= 0xff;

    await expect(parseResourcePackage(encoded)).rejects.toMatchObject({
      code: "checksum-mismatch",
    });
  });
});
