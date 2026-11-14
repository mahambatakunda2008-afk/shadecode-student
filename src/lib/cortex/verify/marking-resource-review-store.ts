import type { MarkingResourceExtraction } from "./marking-resource-extraction";
import type { LocalVerifyExtraction } from "./local-extraction-contract";

export type ManualVisualRegion = { id: string; page: number; x: number; y: number; width: number; height: number; label: string; annotation?: string; linkedOcrRegionIds?: string[]; crop?: Blob; cropWidth?: number; cropHeight?: number; };

export type MarkingResourceReviewDraft = {
  resourceId: string;
  ownerId: string;
  extraction: MarkingResourceExtraction;
  correctedLines: Array<{ page: number; line: number; text: string }>;
  localOcr?: LocalVerifyExtraction;
  manualVisualRegions?: ManualVisualRegion[];
  savedAt: string;
};

const MAX_VISUAL_REGIONS = 40;
const MAX_VISUAL_CROP_BYTES = 4 * 1024 * 1024;
const MAX_VISUAL_CROP_TOTAL_BYTES = 24 * 1024 * 1024;

function validateVisualRegions(regions: ManualVisualRegion[] = []): void {
  if (regions.length > MAX_VISUAL_REGIONS) throw new Error(`A review can contain at most ${MAX_VISUAL_REGIONS} visual regions.`);
  const ids = new Set<string>();
  let totalBytes = 0;
  for (const region of regions) {
    if (!region.id.trim() || ids.has(region.id)) throw new Error("Visual region identifiers must be unique.");
    ids.add(region.id);
    if (!Number.isInteger(region.page) || region.page < 0) throw new Error("A visual region has an invalid page reference.");
    if (![region.x, region.y, region.width, region.height].every(Number.isFinite)
      || region.x < 0 || region.y < 0 || region.width <= 0 || region.height <= 0
      || region.x + region.width > 1.00001 || region.y + region.height > 1.00001) {
      throw new Error("A visual region has invalid normalized coordinates.");
    }
    if (region.label.length > 100 || (region.annotation || "").length > 1000
      || (region.linkedOcrRegionIds || []).length > 200) {
      throw new Error("Visual region notes or links exceed the allowed size.");
    }
    if (region.crop) {
      if (region.crop.type !== "image/webp" && region.crop.type !== "image/png" && region.crop.type !== "image/jpeg") {
        throw new Error("Visual crops must be WebP, PNG or JPEG images.");
      }
      if (region.crop.size <= 0 || region.crop.size > MAX_VISUAL_CROP_BYTES) {
        throw new Error("Each visual crop must be 4 MB or smaller.");
      }
      totalBytes += region.crop.size;
    }
  }
  if (totalBytes > MAX_VISUAL_CROP_TOTAL_BYTES) {
    throw new Error("Visual crops for one review cannot exceed 24 MB. Remove some regions or select smaller crops.");
  }
}

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
  validateVisualRegions(draft.manualVisualRegions);
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
