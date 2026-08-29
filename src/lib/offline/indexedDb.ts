const DB_NAME = "shadecode-student";
const DB_VERSION = 1;
const STORE_NAME = "records";
const MUTATION_STORE = "mutations";

export type LocalRecord = { id: string; entity: string; value: unknown; updatedAt: number };

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "id" });
      if (!db.objectStoreNames.contains(MUTATION_STORE)) db.createObjectStore(MUTATION_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open local database"));
  });
}

export async function putLocalRecord(record: LocalRecord): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to write local record"));
  });
  db.close();
}

export async function getLocalRecord(id: string): Promise<LocalRecord | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id);
    request.onsuccess = () => { db.close(); resolve(request.result as LocalRecord | undefined); };
    request.onerror = () => { db.close(); reject(request.error ?? new Error("Failed to read local record")); };
  });
}

export async function deleteLocalRecord(id: string): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to delete local record"));
  });
  db.close();
}
