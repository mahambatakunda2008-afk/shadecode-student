export type VerifyArtifactExecution = "none" | "online-cloud" | "local";

export type VerifyArtifact = {
  id: string;
  userId: string;
  title: string;
  sourceImage: Blob;
  mimeType: string;
  sourceName: string;
  rawExtractedText: string;
  editedText: string;
  extractionConfidence?: number;
  extractionWarnings: string[];
  extractionExecution: VerifyArtifactExecution;
  createdAt: string;
  updatedAt: string;
};

export type SaveVerifyArtifactInput = Partial<Pick<
  VerifyArtifact,
  "title" | "sourceImage" | "mimeType" | "sourceName" | "rawExtractedText" |
  "editedText" | "extractionConfidence" | "extractionWarnings" | "extractionExecution"
>> & {
  sourceImage?: Blob;
};

const DB_NAME = "shadecode_cortex_verify_artifacts";
const STORE_NAME = "artifacts";
const DB_VERSION = 1;
const MAX_ARTIFACTS_PER_ACCOUNT = 20;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_TEXT_CHARS = 120_000;

function ownerId(value: string) {
  if (!value?.trim()) throw new Error("A signed-in account is required to save Verify work.");
  return value.trim();
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Local Verify storage is unavailable in this browser."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("userId", "userId", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open local Verify storage."));
  });
}

function validateInput(input: SaveVerifyArtifactInput) {
  if (input.sourceImage && input.sourceImage.size > MAX_IMAGE_BYTES) {
    throw new Error("This source image is too large to save locally. Choose an image under 4 MB.");
  }
  if (input.sourceImage && input.sourceImage.type && !["image/jpeg", "image/png", "image/webp"].includes(input.sourceImage.type)) {
    throw new Error("Only JPG, PNG and WEBP source images can be saved in Verify.");
  }
  if ((input.rawExtractedText?.length || 0) > MAX_TEXT_CHARS || (input.editedText?.length || 0) > MAX_TEXT_CHARS) {
    throw new Error("This extracted text is too large to save. Split it into smaller pieces.");
  }
  if (input.extractionConfidence !== undefined &&
      (!Number.isFinite(input.extractionConfidence) || input.extractionConfidence < 0 || input.extractionConfidence > 1)) {
    throw new Error("Extraction confidence must be between 0 and 1.");
  }
}

export async function saveVerifyArtifact(
  userId: string,
  input: SaveVerifyArtifactInput,
  artifactId?: string,
): Promise<VerifyArtifact> {
  const owner = ownerId(userId);
  validateInput(input);
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const id = artifactId || crypto.randomUUID();
    let saved: VerifyArtifact | undefined;
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const existing = getRequest.result as VerifyArtifact | undefined;
      if (existing && existing.userId !== owner) {
        tx.abort();
        return;
      }
      if (!existing && artifactId) {
        tx.abort();
        return;
      }
      const now = new Date().toISOString();
      const sourceImage = input.sourceImage || existing?.sourceImage;
      if (!sourceImage) {
        tx.abort();
        return;
      }
      saved = {
        id,
        userId: owner,
        title: (input.title ?? existing?.title ?? "Verify capture").trim().slice(0, 120) || "Verify capture",
        sourceImage,
        mimeType: input.mimeType ?? existing?.mimeType ?? sourceImage.type,
        sourceName: input.sourceName ?? existing?.sourceName ?? "capture",
        rawExtractedText: input.rawExtractedText ?? existing?.rawExtractedText ?? "",
        editedText: input.editedText ?? existing?.editedText ?? "",
        extractionConfidence: input.extractionConfidence ?? existing?.extractionConfidence,
        extractionWarnings: input.extractionWarnings ?? existing?.extractionWarnings ?? [],
        extractionExecution: input.extractionExecution ?? existing?.extractionExecution ?? "none",
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      store.put(saved);
      const listRequest = store.index("userId").getAll(owner);
      listRequest.onsuccess = () => {
        const records = (listRequest.result as VerifyArtifact[])
          .filter((item) => item.id !== id)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        for (const old of records.slice(MAX_ARTIFACTS_PER_ACCOUNT - 1)) store.delete(old.id);
      };
    };
    tx.oncomplete = () => { db.close(); if (saved) resolve(saved); else reject(new Error("Verify capture could not be saved.")); };
    tx.onerror = () => { db.close(); reject(tx.error || new Error("Verify capture could not be saved.")); };
    tx.onabort = () => { db.close(); reject(tx.error || new Error("Verify capture could not be saved for this account.")); };
  });
}

export async function listVerifyArtifacts(userId: string): Promise<VerifyArtifact[]> {
  const owner = ownerId(userId);
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).index("userId").getAll(owner);
    request.onsuccess = () => resolve((request.result as VerifyArtifact[]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    request.onerror = () => reject(request.error || new Error("Could not read saved Verify captures."));
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function deleteVerifyArtifact(userId: string, artifactId: string): Promise<void> {
  const owner = ownerId(userId);
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(artifactId);
    request.onsuccess = () => {
      const artifact = request.result as VerifyArtifact | undefined;
      if (artifact?.userId === owner) store.delete(artifactId);
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error || new Error("Could not delete this Verify capture.")); };
    tx.onabort = () => { db.close(); reject(tx.error || new Error("Could not delete this Verify capture.")); };
  });
}
