import { describe, expect, it } from "vitest";
import type { ResourcePackageManifestV1, ResourcePackageV1 } from "./resource-package";
import {
  ResourcePackageStore,
  type ResourcePackageStorage,
} from "./resource-package-store";
import { createResourcePackage } from "./resource-package";

const metadata = {
  title: "AS Physics: Wave motion",
  mimeType: "application/pdf",
  fileName: "wave-motion.pdf",
  createdAt: "2026-11-22T10:00:00.000Z",
  curriculum: { subject: "Physics", subjectCode: "9702", topic: "Waves" },
  provenance: {
    origin: "local-import" as const,
    importedAt: "2026-11-22T10:00:00.000Z",
    checksumAlgorithm: "SHA-256" as const,
  },
  review: { status: "unreviewed" as const },
};

class MemoryResourceStorage implements ResourcePackageStorage {
  private packages = new Map<string, ResourcePackageV1>();
  private catalog = new Map<string, ResourcePackageManifestV1>();

  async put(resource: ResourcePackageV1): Promise<void> {
    this.packages.set(resource.manifest.resourceId, resource);
    this.catalog.set(resource.manifest.resourceId, resource.manifest);
  }
  async get(id: string): Promise<ResourcePackageV1 | null> {
    return this.packages.get(id) ?? null;
  }
  async listManifests(): Promise<ResourcePackageManifestV1[]> {
    return [...this.catalog.values()];
  }
  async delete(id: string): Promise<void> {
    this.packages.delete(id);
    this.catalog.delete(id);
  }
  corrupt(id: string): void {
    const resource = this.packages.get(id);
    if (resource) {
      const payload = new Uint8Array(resource.payload);
      if (payload.byteLength > 0) payload[0] ^= 0xff;
      this.packages.set(id, { ...resource, payload });
    }
  }
}

describe("ResourcePackageStore", () => {
  it("persists exact original bytes and lists metadata without reading payloads", async () => {
    const storage = new MemoryResourceStorage();
    const store = new ResourcePackageStore(storage);
    const payload = new TextEncoder().encode("%PDF-1.7 original bytes");
    const packageData = await createResourcePackage(metadata, payload);

    const manifest = await store.save(packageData);
    expect(manifest.resourceId).toBe(packageData.manifest.resourceId);
    expect(await store.get(manifest.resourceId)).toMatchObject({
      manifest: { title: "AS Physics: Wave motion" },
      payload,
    });
    expect(await store.list()).toEqual([manifest]);
  });

  it("refuses corrupt data before saving and detects corruption after storage", async () => {
    const storage = new MemoryResourceStorage();
    const store = new ResourcePackageStore(storage);
    const packageData = await createResourcePackage(metadata, new TextEncoder().encode("original"));
    const invalid = { ...packageData, payload: new TextEncoder().encode("tampered") };

    await expect(store.save(invalid)).rejects.toMatchObject({ code: "checksum-mismatch" });
    expect(await store.list()).toHaveLength(0);

    await store.save(packageData);
    storage.corrupt(packageData.manifest.resourceId);
    await expect(store.get(packageData.manifest.resourceId)).rejects.toMatchObject({
      code: "checksum-mismatch",
    });
  });

  it("deletes payload and catalog entry together through the storage boundary", async () => {
    const storage = new MemoryResourceStorage();
    const store = new ResourcePackageStore(storage);
    const packageData = await createResourcePackage(metadata, new Uint8Array([1, 2, 3]));
    await store.save(packageData);

    await store.delete(packageData.manifest.resourceId);
    expect(await store.get(packageData.manifest.resourceId)).toBeNull();
    expect(await store.list()).toEqual([]);
  });
});
