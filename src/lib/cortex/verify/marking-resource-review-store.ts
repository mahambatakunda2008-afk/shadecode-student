import type { MarkingResourceExtraction } from "./marking-resource-extraction";

export type MarkingResourceReviewDraft = {
  resourceId: string;
  ownerId: string;
  extraction: MarkingResourceExtraction;
  correctedLines: Array<{ page: number; line: number; text: string }>;
  savedAt: string;
};

const DB_NAME = "shadecode_marking_resource_reviews";
const STORE_NAME = "drafts";
const DB_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Local review storage is unavailable in this browser."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "resourceId" });
        store.createIndex("ownerId", "ownerId", { unique: false });
        store.createIndex("savedAt", "savedAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open local review storage."));
  });
}

export async function saveMarkingResourceReviewDraft(
  ownerId: string,
  draft: Omit<MarkingResourceReviewDraft, "ownerId" | "savedAt">,
): Promise<void> {
  if (!ownerId.trim() || !draft.resourceId.trim()) throw new Error("A signed-in owner and resource are required.");
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ ...draft, ownerId, savedAt: new Date().toISOString() } satisfies MarkingResourceReviewDraft);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error || new Error("Could not save review corrections.")); };
    tx.onabort = () => { db.close(); reject(tx.error || new Error("Review save was cancelled.")); };
  });
}

export async function getMarkingResourceReviewDraft(
  ownerId: string,
  resourceId: string,
): Promise<MarkingResourceReviewDraft | null> {
  if (!ownerId.trim() || !resourceId.trim()) return null;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(resourceId);
    request.onsuccess = () => {
      const value = request.result as MarkingResourceReviewDraft | undefined;
      resolve(value?.ownerId === ownerId ? value : null);
    };
    request.onerror = () => reject(request.error || new Error("Could not load review corrections."));
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
