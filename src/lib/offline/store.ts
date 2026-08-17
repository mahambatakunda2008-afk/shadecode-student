const DB_NAME = "shadecode-offline";
const DB_VERSION = 1;
const EVENTS_STORE = "events";
const KV_STORE = "kv";

export type OfflineEvent = {
  id: string;
  type: string;
  payload: unknown;
  createdAt: string;
  attempts: number;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Failed to open offline database"));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(EVENTS_STORE)) {
        const events = db.createObjectStore(EVENTS_STORE, { keyPath: "id" });
        events.createIndex("createdAt", "createdAt", { unique: false });
      }
      if (!db.objectStoreNames.contains(KV_STORE)) db.createObjectStore(KV_STORE);
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export async function enqueueOfflineEvent(type: string, payload: unknown): Promise<string> {
  const id = crypto.randomUUID();
  const event: OfflineEvent = { id, type, payload, createdAt: new Date().toISOString(), attempts: 0 };
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EVENTS_STORE, "readwrite");
    tx.objectStore(EVENTS_STORE).put(event);
    tx.oncomplete = () => { db.close(); resolve(id); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error("Failed to queue offline event")); };
  });
}

export async function listOfflineEvents(): Promise<OfflineEvent[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EVENTS_STORE, "readonly");
    const request = tx.objectStore(EVENTS_STORE).index("createdAt").getAll();
    request.onsuccess = () => { db.close(); resolve(request.result as OfflineEvent[]); };
    request.onerror = () => { db.close(); reject(request.error ?? new Error("Failed to read offline events")); };
  });
}

export async function removeOfflineEvent(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EVENTS_STORE, "readwrite");
    tx.objectStore(EVENTS_STORE).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error("Failed to remove offline event")); };
  });
}

export async function setOfflineValue<T>(key: string, value: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KV_STORE, "readwrite");
    tx.objectStore(KV_STORE).put(value, key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error("Failed to store offline value")); };
  });
}

export async function getOfflineValue<T>(key: string): Promise<T | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KV_STORE, "readonly");
    const request = tx.objectStore(KV_STORE).get(key);
    request.onsuccess = () => { db.close(); resolve(request.result as T | undefined); };
    request.onerror = () => { db.close(); reject(request.error ?? new Error("Failed to read offline value")); };
  });
}
