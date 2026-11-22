import {
  validateResourcePackage,
  type ResourcePackageManifestV1,
  type ResourcePackageV1,
} from "./resource-package";

const DB_NAME = "shadecode-resource-packages";
const DB_VERSION = 1;
const PACKAGE_STORE = "packages";
const CATALOG_STORE = "catalog";

/** Storage boundary keeps package integrity policy independent from the browser database. */
export interface ResourcePackageStorage {
  put(resource: ResourcePackageV1): Promise<void>;
  get(resourceId: string): Promise<ResourcePackageV1 | null>;
  listManifests(): Promise<ResourcePackageManifestV1[]>;
  delete(resourceId: string): Promise<void>;
}

export class ResourcePackageStorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ResourcePackageStorageError";
  }
}

/**
 * Browser-backed durable storage.
 * Payload and searchable catalog metadata commit in one IndexedDB transaction.
 * The catalog is separate so listing never loads every large document into memory.
 */
export class IndexedDbResourcePackageStorage implements ResourcePackageStorage {
  private database: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    if (this.database) return this.database;
    if (typeof indexedDB === "undefined") {
      return Promise.reject(new ResourcePackageStorageError("IndexedDB is unavailable in this environment."));
    }

    this.database = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PACKAGE_STORE)) {
          const packages = db.createObjectStore(PACKAGE_STORE, { keyPath: "manifest.resourceId" });
          packages.createIndex("subject", "manifest.curriculum.subject", { unique: false });
        }
        if (!db.objectStoreNames.contains(CATALOG_STORE)) {
          const catalog = db.createObjectStore(CATALOG_STORE, { keyPath: "resourceId" });
          catalog.createIndex("subject", "curriculum.subject", { unique: false });
          catalog.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          this.database = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        this.database = null;
        reject(new ResourcePackageStorageError("Could not open the offline resource library.", { cause: request.error }));
      };
      request.onblocked = () => {
        this.database = null;
        reject(new ResourcePackageStorageError("The offline resource library is blocked by another open tab."));
      };
    });
    return this.database;
  }

  async put(resource: ResourcePackageV1): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([PACKAGE_STORE, CATALOG_STORE], "readwrite");
      transaction.objectStore(PACKAGE_STORE).put(resource);
      transaction.objectStore(CATALOG_STORE).put(resource.manifest);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new ResourcePackageStorageError(
        "Could not save the offline resource package.",
        { cause: transaction.error },
      ));
      transaction.onabort = () => reject(new ResourcePackageStorageError(
        transaction.error?.name === "QuotaExceededError"
          ? "Device storage is full. Free space before downloading more resources."
          : "Offline resource save was cancelled.",
        { cause: transaction.error },
      ));
    });
  }

  async get(resourceId: string): Promise<ResourcePackageV1 | null> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const request = db.transaction([PACKAGE_STORE], "readonly")
        .objectStore(PACKAGE_STORE).get(resourceId);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(new ResourcePackageStorageError(
        "Could not read the offline resource package.",
        { cause: request.error },
      ));
    });
  }

  async listManifests(): Promise<ResourcePackageManifestV1[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const request = db.transaction([CATALOG_STORE], "readonly")
        .objectStore(CATALOG_STORE).getAll();
      request.onsuccess = () => resolve(request.result ?? []);
      request.onerror = () => reject(new ResourcePackageStorageError(
        "Could not list the offline resource library.",
        { cause: request.error },
      ));
    });
  }

  async delete(resourceId: string): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([PACKAGE_STORE, CATALOG_STORE], "readwrite");
      transaction.objectStore(PACKAGE_STORE).delete(resourceId);
      transaction.objectStore(CATALOG_STORE).delete(resourceId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new ResourcePackageStorageError(
        "Could not remove the offline resource package.",
        { cause: transaction.error },
      ));
      transaction.onabort = () => reject(new ResourcePackageStorageError(
        "Offline resource removal was cancelled.",
        { cause: transaction.error },
      ));
    });
  }
}

/** Integrity-enforcing facade shared by browser, native and test storage adapters. */
export class ResourcePackageStore {
  constructor(private readonly storage: ResourcePackageStorage) {}

  async save(resource: unknown): Promise<ResourcePackageManifestV1> {
    const verified = await validateResourcePackage(resource);
    await this.storage.put(verified);
    return verified.manifest;
  }

  async get(resourceId: string): Promise<ResourcePackageV1 | null> {
    const stored = await this.storage.get(resourceId);
    if (!stored) return null;
    return validateResourcePackage(stored);
  }

  list(): Promise<ResourcePackageManifestV1[]> {
    return this.storage.listManifests();
  }

  delete(resourceId: string): Promise<void> {
    return this.storage.delete(resourceId);
  }
}

export const resourcePackageStore = new ResourcePackageStore(
  new IndexedDbResourcePackageStorage(),
);
