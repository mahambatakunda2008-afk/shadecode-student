import type { ImportedMarkingResource } from "./marking-resource-import";

const DB_NAME = "shadecode_marking_resource_intake";
const STORE_NAME = "resources";
const DB_VERSION = 1;
const MAX_RESOURCES_PER_ACCOUNT = 100;

function requireOwner(ownerId: string) {
  if (!ownerId?.trim()) throw new Error("A signed-in account is required to access imported resources.");
  return ownerId.trim();
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Local resource storage is unavailable in this browser."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("ownerId", "ownerId", { unique: false });
        store.createIndex("contentSha256", "contentSha256", { unique: false });
        store.createIndex("updatedAt", "retrievedAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open local resource storage."));
  });
}

/** Store the original upload locally. It remains unusable for marking until rights and content are reviewed. */
export async function saveImportedMarkingResource(
  ownerId: string,
  resource: ImportedMarkingResource,
): Promise<ImportedMarkingResource> {
  const owner = requireOwner(ownerId);
  if (resource.ownerId !== owner) throw new Error("This resource belongs to a different account.");
  if (!resource.fileBlob || resource.fileBlob.size !== resource.byteLength) {
    throw new Error("The original resource file is incomplete.");
  }
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const list = store.index("ownerId").getAll(owner);
    let saved: ImportedMarkingResource | undefined;
    list.onsuccess = () => {
      const records = list.result as ImportedMarkingResource[];
      const duplicate = records.find(item => item.contentSha256 === resource.contentSha256);
      if (duplicate) {
        saved = duplicate;
        return;
      }
      if (records.length >= MAX_RESOURCES_PER_ACCOUNT) {
        tx.abort();
        return;
      }
      store.add(resource);
      saved = resource;
    };
    tx.oncomplete = () => {
      db.close();
      if (saved) resolve(saved);
      else reject(new Error("The resource could not be saved."));
    };
    tx.onerror = () => { db.close(); reject(tx.error || new Error("The resource could not be saved.")); };
    tx.onabort = () => {
      db.close();
      reject(tx.error || new Error("Resource limit reached or local save was blocked."));
    };
  });
}

export async function listImportedMarkingResources(ownerId: string): Promise<ImportedMarkingResource[]> {
  const owner = requireOwner(ownerId);
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).index("ownerId").getAll(owner);
    request.onsuccess = () => resolve((request.result as ImportedMarkingResource[]).sort(
      (a, b) => b.retrievedAt!.localeCompare(a.retrievedAt!),
    ));
    request.onerror = () => reject(request.error || new Error("Could not read imported resources."));
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getImportedMarkingResource(
  ownerId: string,
  resourceId: string,
): Promise<ImportedMarkingResource | null> {
  const owner = requireOwner(ownerId);
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(resourceId);
    request.onsuccess = () => {
      const resource = request.result as ImportedMarkingResource | undefined;
      resolve(resource?.ownerId === owner ? resource : null);
    };
    request.onerror = () => reject(request.error || new Error("Could not open this imported resource."));
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function deleteImportedMarkingResource(ownerId: string, resourceId: string): Promise<void> {
  const owner = requireOwner(ownerId);
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(resourceId);
    request.onsuccess = () => {
      const resource = request.result as ImportedMarkingResource | undefined;
      if (resource?.ownerId === owner) store.delete(resourceId);
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error || new Error("Could not delete this imported resource.")); };
    tx.onabort = () => { db.close(); reject(tx.error || new Error("Could not delete this imported resource.")); };
  });
}
