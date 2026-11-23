/**
 * Durable browser/PWA resource library. Unlike the transient ShadeNet cache,
 * entries here are never evicted automatically and remain available offline.
 */
export type OfflineResourceTrust = "official" | "teacher-verified" | "community" | "ai-generated" | "unverified";

export interface OfflineResourceMetadata {
  id: string;
  ownerId: string;
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
const DB_VERSION = 2;
// Version 1 used a global content-hash key and had no account owner. Keep that
// legacy store untouched and inaccessible; never silently assign old files to
// whichever account happens to sign in after the upgrade.
const STORE = "files_by_account";
const MAX_PDF_BYTES = 100 * 1024 * 1024;
const MAX_TEXT_BYTES = 5 * 1024 * 1024;

function maxResourceBytes(mimeType: string): number {
  return mimeType === "application/pdf" ? MAX_PDF_BYTES : MAX_TEXT_BYTES;
}

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
          const files = db.createObjectStore(STORE, { keyPath: ["metadata.ownerId", "metadata.id"] });
          files.createIndex("ownerId", "metadata.ownerId", { unique: false });
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

  async importFile(accountId: string, file: Blob, details: Omit<OfflineResourceMetadata, "id" | "ownerId" | "mimeType" | "byteLength" | "sha256" | "importedAt" | "trust"> & { mimeType?: string; trust?: OfflineResourceTrust }): Promise<OfflineResourceMetadata> {
    if (!accountId.trim()) throw new Error("Sign in before saving a private resource.");
    if (!file.size) throw new Error("The selected resource is empty.");
    const mimeType = details.mimeType || (typeof File !== "undefined" && file instanceof File ? file.type : "") || "application/octet-stream";
    if (file.size > maxResourceBytes(mimeType)) throw new Error(mimeType === "application/pdf" ? "This PDF exceeds the 100 MB offline limit." : "This text resource exceeds the 5 MB offline limit.");
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
      ownerId: accountId,
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

  async list(accountId: string, subject?: string): Promise<OfflineResourceMetadata[]> {
    if (!accountId.trim()) throw new Error("Sign in before opening a private resource library.");
    await this.init();
    const records = await new Promise<StoredOfflineResource[]>((resolve, reject) => {
      const request = this.db!.transaction(STORE, "readonly").objectStore(STORE).index("ownerId").getAll(accountId);
      request.onsuccess = () => resolve(request.result as StoredOfflineResource[]);
      request.onerror = () => reject(request.error);
    });
    return records.map((record) => record.metadata)
      .filter((metadata) => !subject || metadata.subject?.toLowerCase() === subject.toLowerCase())
      .sort((a, b) => b.importedAt.localeCompare(a.importedAt));
  }

  async open(accountId: string, id: string): Promise<{ metadata: OfflineResourceMetadata; blob: Blob } | null> {
    if (!accountId.trim()) throw new Error("Sign in before opening a private resource.");
    await this.init();
    const record = await new Promise<StoredOfflineResource | undefined>((resolve, reject) => {
      const request = this.db!.transaction(STORE, "readonly").objectStore(STORE).get([accountId, id]);
      request.onsuccess = () => resolve(request.result as StoredOfflineResource | undefined);
      request.onerror = () => reject(request.error);
    });
    if (!record) return null;
    if (record.metadata.ownerId !== accountId) throw new Error("This resource belongs to a different account.");
    if (record.blob.size !== record.metadata.byteLength || await sha256(record.blob) !== record.metadata.sha256) {
      throw new Error("Offline resource integrity check failed. Re-import this file from a trusted copy.");
    }
    return { metadata: record.metadata, blob: record.blob };
  }

  async remove(accountId: string, id: string): Promise<void> {
    if (!accountId.trim()) throw new Error("Sign in before removing a private resource.");
    await this.init();
    await new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).delete([accountId, id]);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error("Resource deletion was cancelled."));
    });
  }

  async exportPack(accountId: string): Promise<Blob> {
    if (!accountId.trim()) throw new Error("Sign in before exporting private resources.");
    await this.init();
    const records = await new Promise<StoredOfflineResource[]>((resolve, reject) => {
      const request = this.db!.transaction(STORE, "readonly").objectStore(STORE).index("ownerId").getAll(accountId);
      request.onsuccess = () => resolve(request.result as StoredOfflineResource[]);
      request.onerror = () => reject(request.error);
    });
    if (!records.length) throw new Error("There are no resources to export.");
    const payloads: Blob[] = [];
    const entries: Array<{ metadata: OfflineResourceMetadata; offset: number; length: number }> = [];
    let offset = 0;
    for (const record of records) {
      if (record.blob.size !== record.metadata.byteLength || await sha256(record.blob) !== record.metadata.sha256) {
        throw new Error(`Integrity check failed for "${record.metadata.title}". Export stopped.`);
      }
      if (record.blob.size > maxResourceBytes(record.metadata.mimeType) || offset + record.blob.size > 512 * 1024 * 1024) {
        throw new Error("The resource collection exceeds the 512 MB resource-pack limit.");
      }
      entries.push({ metadata: record.metadata, offset, length: record.blob.size });
      payloads.push(record.blob);
      offset += record.blob.size;
    }
    const manifest = new TextEncoder().encode(JSON.stringify({ format: "shadecode-resource-pack", version: 1, entries }));
    if (manifest.byteLength > 8 * 1024 * 1024) throw new Error("The resource-pack manifest is too large.");
    const header = new Uint8Array(12);
    header.set(new TextEncoder().encode("SCRES01\n"), 0);
    new DataView(header.buffer).setUint32(8, manifest.byteLength, true);
    return new Blob([header, manifest, ...payloads], { type: "application/vnd.shadecode.resource-pack" });
  }

  async importPack(accountId: string, pack: Blob): Promise<number> {
    if (!accountId.trim()) throw new Error("Sign in before importing private resources.");
    const MAX_PACK_BYTES = 512 * 1024 * 1024;
    const MAX_MANIFEST_BYTES = 8 * 1024 * 1024;
    if (pack.size < 12 || pack.size > MAX_PACK_BYTES) throw new Error("The resource pack is empty or exceeds the 512 MB import limit.");
    const header = new Uint8Array(await pack.slice(0, 12).arrayBuffer());
    const magic = new TextDecoder().decode(header.subarray(0, 8));
    if (magic !== "SCRES01\n") throw new Error("This is not a Shadecode resource pack.");
    const manifestLength = new DataView(header.buffer, header.byteOffset, header.byteLength).getUint32(8, true);
    const payloadStart = 12 + manifestLength;
    if (!manifestLength || manifestLength > MAX_MANIFEST_BYTES || payloadStart > pack.size) {
      throw new Error("The resource pack manifest is damaged or too large.");
    }
    let manifest: { format?: string; version?: number; entries?: Array<{ metadata?: Partial<OfflineResourceMetadata>; offset?: number; length?: number }> };
    try {
      manifest = JSON.parse(await pack.slice(12, payloadStart).text());
    } catch {
      throw new Error("The resource pack manifest could not be read.");
    }
    if (manifest.format !== "shadecode-resource-pack" || manifest.version !== 1 ||
        !Array.isArray(manifest.entries) || manifest.entries.length < 1 || manifest.entries.length > 1000) {
      throw new Error("The resource pack format or version is not supported.");
    }

    const ranges: Array<{ start: number; end: number }> = [];
    const seenHashes = new Set<string>();
    for (const entry of manifest.entries) {
      const metadata = entry.metadata;
      const offset = entry.offset;
      const length = entry.length;
      if (!metadata || typeof metadata.title !== "string" || !metadata.title.trim() || metadata.title.length > 500 ||
          typeof metadata.mimeType !== "string" || !["application/pdf", "text/plain", "text/markdown"].includes(metadata.mimeType) ||
          typeof metadata.sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(metadata.sha256) ||
          metadata.byteLength !== length || !Number.isSafeInteger(offset) || !Number.isSafeInteger(length) ||
          offset! < 0 || length! <= 0 || length! > maxResourceBytes(metadata.mimeType) ||
          payloadStart + offset! + length! > pack.size) {
        throw new Error("The resource pack contains an invalid resource entry.");
      }
      const normalizedHash = metadata.sha256.toLowerCase();
      if (seenHashes.has(normalizedHash)) {
        throw new Error("The resource pack contains duplicate content entries.");
      }
      seenHashes.add(normalizedHash);
      const payload = pack.slice(payloadStart + offset!, payloadStart + offset! + length!, metadata.mimeType);
      if (await sha256(payload) !== normalizedHash) {
        throw new Error(`The resource pack contains corrupted data for "${metadata.title}". No files were imported.`);
      }
      if (metadata.mimeType === "application/pdf") {
        const signature = new TextDecoder().decode(await payload.slice(0, 5).arrayBuffer());
        if (signature !== "%PDF-") throw new Error("The resource pack contains a file with an invalid PDF signature.");
      }
      ranges.push({ start: offset!, end: offset! + length! });
    }
    ranges.sort((left, right) => left.start - right.start);
    for (let index = 0; index < ranges.length; index += 1) {
      if ((index === 0 && ranges[index].start !== 0) ||
          (index > 0 && ranges[index].start !== ranges[index - 1].end)) {
        throw new Error("The resource pack contains overlapping, missing or unreferenced file data.");
      }
    }
    if (ranges[ranges.length - 1].end !== pack.size - payloadStart) {
      throw new Error("The resource pack contains trailing or unreferenced data.");
    }

    // Commit the complete verified pack in one IndexedDB transaction. A quota
    // or storage failure aborts every entry instead of leaving a partial import.
    const importedRecords: StoredOfflineResource[] = manifest.entries.map((entry) => {
      const source = entry.metadata!;
      const digest = source.sha256!.toLowerCase();
      const metadata: OfflineResourceMetadata = {
        id: digest,
        ownerId: accountId,
        title: source.title!.trim(),
        mimeType: source.mimeType!,
        byteLength: entry.length!,
        sha256: digest,
        subject: typeof source.subject === "string" ? source.subject : undefined,
        qualification: typeof source.qualification === "string" ? source.qualification : undefined,
        syllabus: typeof source.syllabus === "string" ? source.syllabus : undefined,
        topic: typeof source.topic === "string" ? source.topic : undefined,
        source: typeof source.source === "string" ? source.source : undefined,
        publisher: typeof source.publisher === "string" ? source.publisher : undefined,
        trust: "unverified",
        importedAt: new Date().toISOString(),
      };
      const blob = pack.slice(payloadStart + entry.offset!, payloadStart + entry.offset! + entry.length!, source.mimeType);
      return { metadata, blob };
    });
    await this.init();
    await new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(STORE, "readwrite");
      const store = transaction.objectStore(STORE);
      importedRecords.forEach((record) => store.put(record));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not import the complete resource pack."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Resource-pack import was cancelled; no entries were committed."));
    });
    return importedRecords.length;
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
