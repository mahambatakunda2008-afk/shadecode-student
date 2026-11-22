/**
 * Durable browser/PWA resource library. Unlike the transient ShadeNet cache,
 * entries here are never evicted automatically and remain available offline.
 */
export type OfflineResourceTrust = "official" | "teacher-verified" | "community" | "ai-generated" | "unverified";

export interface OfflineResourceMetadata {
  id: string;
  title: string;
  mimeType: string;
  byteLength: number;
  sha256: string;
  subject?: string;
  qualification?: string;
  syllabus?: string;
  topic?: string;
  source?: string;
  publisher?: string;
  trust: OfflineResourceTrust;
  importedAt: string;
  lastOpenedAt?: string;
}

interface StoredOfflineResource {
  metadata: OfflineResourceMetadata;
  blob: Blob;
}

const DB_NAME = "shadecode-offline-library";
const DB_VERSION = 1;
const STORE = "files";
const MAX_RESOURCE_BYTES = 150 * 1024 * 1024;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(blob: Blob): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("Secure browser cryptography is required to verify offline resources.");
  return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer())));
}

export class OfflineResourceLibrary {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (typeof indexedDB === "undefined") throw new Error("Offline resource storage is unavailable in this browser.");
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error ?? new Error("Could not open offline resource storage."));
      request.onblocked = () => reject(new Error("Close other Shadecode Student tabs to finish the offline library upgrade."));
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const files = db.createObjectStore(STORE, { keyPath: "metadata.id" });
          files.createIndex("subject", "metadata.subject", { unique: false });
          files.createIndex("importedAt", "metadata.importedAt", { unique: false });
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        this.db.onversionchange = () => { this.db?.close(); this.db = null; };
        resolve();
      };
    });
  }

  async importFile(file: Blob, details: Omit<OfflineResourceMetadata, "id" | "mimeType" | "byteLength" | "sha256" | "importedAt" | "trust"> & { mimeType?: string; trust?: OfflineResourceTrust }): Promise<OfflineResourceMetadata> {
    if (!file.size) throw new Error("The selected resource is empty.");
    if (file.size > MAX_RESOURCE_BYTES) throw new Error("This resource exceeds the 150 MB per-file offline limit.");
    const mimeType = details.mimeType || (typeof File !== "undefined" && file instanceof File ? file.type : "") || "application/octet-stream";
    if (!["application/pdf", "text/plain", "text/markdown"].includes(mimeType)) {
      throw new Error("Supported resource formats are PDF, plain text and Markdown.");
    }
    if (mimeType === "application/pdf") {
      const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());
      if (String.fromCharCode(...signature) !== "%PDF-") throw new Error("The selected file is not a valid PDF.");
    }
    const digest = await sha256(file);
    const metadata: OfflineResourceMetadata = {
      ...details,
      id: digest,
      mimeType,
      byteLength: file.size,
      sha256: digest,
      trust: details.trust ?? "unverified",
      importedAt: new Date().toISOString(),
    };
    await this.init();
    await new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put({ metadata, blob: file } satisfies StoredOfflineResource);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not save the offline resource."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Offline resource save was cancelled."));
    });
    return metadata;
  }

  async list(subject?: string): Promise<OfflineResourceMetadata[]> {
    await this.init();
    const records = await new Promise<StoredOfflineResource[]>((resolve, reject) => {
      const request = this.db!.transaction(STORE, "readonly").objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result as StoredOfflineResource[]);
      request.onerror = () => reject(request.error);
    });
    return records.map((record) => record.metadata)
      .filter((metadata) => !subject || metadata.subject?.toLowerCase() === subject.toLowerCase())
      .sort((a, b) => b.importedAt.localeCompare(a.importedAt));
  }

  async open(id: string): Promise<{ metadata: OfflineResourceMetadata; blob: Blob } | null> {
    await this.init();
    const record = await new Promise<StoredOfflineResource | undefined>((resolve, reject) => {
      const request = this.db!.transaction(STORE, "readonly").objectStore(STORE).get(id);
      request.onsuccess = () => resolve(request.result as StoredOfflineResource | undefined);
      request.onerror = () => reject(request.error);
    });
    if (!record) return null;
    if (record.blob.size !== record.metadata.byteLength || await sha256(record.blob) !== record.metadata.sha256) {
      throw new Error("Offline resource integrity check failed. Re-import this file from a trusted copy.");
    }
    return { metadata: record.metadata, blob: record.blob };
  }

  async remove(id: string): Promise<void> {
    await this.init();
    await new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error("Resource deletion was cancelled."));
    });
  }

  async exportPack(): Promise<Blob> {
    await this.init();
    const records = await new Promise<StoredOfflineResource[]>((resolve, reject) => {
      const request = this.db!.transaction(STORE, "readonly").objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result as StoredOfflineResource[]);
      request.onerror = () => reject(request.error);
    });
    if (!records.length) throw new Error("There are no resources to export.");
    const payloads: ArrayBuffer[] = [];
    const entries: Array<{ metadata: OfflineResourceMetadata; offset: number; length: number }> = [];
    let offset = 0;
    for (const record of records) {
      if (record.blob.size !== record.metadata.byteLength || await sha256(record.blob) !== record.metadata.sha256) {
        throw new Error(`Integrity check failed for "${record.metadata.title}". Export stopped.`);
      }
      const payload = await record.blob.arrayBuffer();
      entries.push({ metadata: record.metadata, offset, length: payload.byteLength });
      payloads.push(payload);
      offset += payload.byteLength;
    }
    const manifest = new TextEncoder().encode(JSON.stringify({ format: "shadecode-resource-pack", version: 1, entries }));
    const header = new Uint8Array(12);
    header.set(new TextEncoder().encode("SCRES01\n"), 0);
    new DataView(header.buffer).setUint32(8, manifest.byteLength, true);
    return new Blob([header, manifest, ...payloads], { type: "application/vnd.shadecode.resource-pack" });
  }

  async importPack(pack: Blob): Promise<number> {
    if (pack.size < 12 || pack.size > 512 * 1024 * 1024) throw new Error("The resource pack is empty or exceeds the 512 MB import limit.");
    const bytes = await pack.arrayBuffer();
    const view = new DataView(bytes);
    const magic = new TextDecoder().decode(new Uint8Array(bytes, 0, 8));
    if (magic !== "SCRES01\n") throw new Error("This is not a Shadecode resource pack.");
    const manifestLength = view.getUint32(8, true);
    const payloadStart = 12 + manifestLength;
    if (!manifestLength || payloadStart > bytes.byteLength) throw new Error("The resource pack manifest is damaged.");
    let manifest: { format?: string; version?: number; entries?: Array<{ metadata?: Partial<OfflineResourceMetadata>; offset?: number; length?: number }> };
    try {
      manifest = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 12, manifestLength)));
    } catch {
      throw new Error("The resource pack manifest could not be read.");
    }
    if (manifest.format !== "shadecode-resource-pack" || manifest.version !== 1 || !Array.isArray(manifest.entries) || manifest.entries.length > 1000) {
      throw new Error("The resource pack format or version is not supported.");
    }
    let imported = 0;
    for (const entry of manifest.entries) {
      const metadata = entry.metadata;
      const offset = entry.offset;
      const length = entry.length;
      if (!metadata || typeof metadata.title !== "string" || typeof metadata.mimeType !== "string" ||
          !Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset! < 0 || length! <= 0 ||
          payloadStart + offset! + length! > bytes.byteLength || length! > MAX_RESOURCE_BYTES) {
        throw new Error("The resource pack contains an invalid resource entry.");
      }
      const blob = new Blob([bytes.slice(payloadStart + offset!, payloadStart + offset! + length!)], { type: metadata.mimeType });
      await this.importFile(blob, {
        title: metadata.title,
        subject: metadata.subject,
        qualification: metadata.qualification,
        syllabus: metadata.syllabus,
        topic: metadata.topic,
        source: metadata.source,
        publisher: metadata.publisher,
        trust: "unverified",
        mimeType: metadata.mimeType,
      });
      imported += 1;
    }
    return imported;
  }

  async requestPersistentStorage(): Promise<boolean> {
    if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
    return navigator.storage.persist();
  }

  async storageEstimate(): Promise<{ usage?: number; quota?: number }> {
    if (typeof navigator === "undefined" || !navigator.storage?.estimate) return {};
    const estimate = await navigator.storage.estimate();
    return { usage: estimate.usage, quota: estimate.quota };
  }
}

export const offlineResourceLibrary = new OfflineResourceLibrary();
