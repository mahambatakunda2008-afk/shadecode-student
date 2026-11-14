import type { VerifyResult } from "@/hooks/useCortexVerify";

type CachedVerifyResult = { id: string; userId: string; cacheKey: string; result: VerifyResult; createdAt: string; expiresAt: number };
const DB_NAME = "shadecode_cortex_verify_results";
const STORE_NAME = "results";
const DB_VERSION = 1;
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_RESULTS_PER_ACCOUNT = 50;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("userId", "userId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open Verify result cache"));
  });
}

async function hashBytes(bytes: BufferSource): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null;
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function hashText(value: string) {
  return hashBytes(new TextEncoder().encode(value));
}

/** Fingerprint exact request content without retaining source images in this cache. */
export async function createVerifyResultCacheKey(input: {
  mode: "check" | "help"; subject?: string; topicId?: string; question?: string; studentAnswer?: string;
  level?: string; image?: Blob | null; visualEvidence?: Array<{ file: Blob; label: string; annotation?: string }>;
}): Promise<string | null> {
  try {
    const images: string[] = [];
    if (input.image) {
      const hash = await hashBytes(await input.image.arrayBuffer());
      if (!hash) return null;
      images.push(hash);
    }
    for (const item of input.visualEvidence || []) {
      const hash = await hashBytes(await item.file.arrayBuffer());
      if (!hash) return null;
      images.push([hash, item.label, item.annotation || ""].join(":"));
    }
    return hashText(JSON.stringify({
      version: 3, mode: input.mode, subject: (input.subject || "General").trim().toLowerCase(), topicId: (input.topicId || "").trim().toLowerCase(),
      question: (input.question || "").trim(), studentAnswer: (input.studentAnswer || "").trim(),
      level: input.mode === "help" ? input.level || "hint" : "", images,
    }));
  } catch { return null; }
}

export async function getCachedVerifyResult(userId: string, cacheKey: string): Promise<VerifyResult | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.index("userId").getAll(userId);
    let found: VerifyResult | null = null;
    request.onsuccess = () => {
      const now = Date.now();
      const records = (request.result as CachedVerifyResult[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      for (const record of records) {
        if (record.expiresAt <= now) store.delete(record.id);
        else if (!found && record.cacheKey === cacheKey) found = { ...record.result, cachedFromExecution: record.result.execution === "cached" ? record.result.cachedFromExecution || "cloud" : record.result.execution || "cloud", execution: "cached" };
      }
    };
    request.onerror = () => reject(request.error || new Error("Could not read Verify result cache"));
    tx.oncomplete = () => { db.close(); resolve(found); };
    tx.onerror = () => { db.close(); reject(tx.error || new Error("Could not read Verify result cache")); };
  });
}

export async function saveCachedVerifyResult(userId: string, cacheKey: string, result: VerifyResult): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const now = Date.now();
    const id = userId + ":" + cacheKey;
    store.put({
      id, userId, cacheKey,
      result: { ...result, execution: result.execution || "cloud" },
      createdAt: new Date(now).toISOString(), expiresAt: now + CACHE_TTL_MS,
    } satisfies CachedVerifyResult);
    const request = store.index("userId").getAll(userId);
    request.onsuccess = () => {
      const records = (request.result as CachedVerifyResult[])
        .filter(item => item.id !== id && item.expiresAt > now)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      for (const old of records.slice(MAX_RESULTS_PER_ACCOUNT - 1)) store.delete(old.id);
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error || new Error("Could not save Verify result")); };
  });
}
