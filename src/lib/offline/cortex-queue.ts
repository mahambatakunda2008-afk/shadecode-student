// Account-scoped IndexedDB queue for Cortex Verify attempts.
// Never expose another signed-in user's offline work on a shared device.

export type CortexAttempt = {
  id: string;
  userId: string;
  mode: 'check' | 'help';
  subject?: string;
  question?: string;
  level?: string;
  studentAnswer?: string;
  imageDataUrl?: string | null;
  createdAt: string;
  attempts?: number;
};

const DB_NAME = 'cortex_verify_db';
const STORE_NAME = 'attempts';
const DB_VERSION = 2;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Offline storage is unavailable in this browser.'));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      const oldStore = req.transaction?.objectStore(STORE_NAME);
      if (db.objectStoreNames.contains(STORE_NAME)) db.deleteObjectStore(STORE_NAME);
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      store.createIndex('userId', 'userId', { unique: false });
      void oldStore;
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function requireUser(userId: string) {
  if (!userId?.trim()) throw new Error('A signed-in account is required for offline verification.');
  return userId.trim();
}

export async function enqueue(attempt: CortexAttempt): Promise<void> {
  requireUser(attempt.userId);
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(attempt);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getAll(userId: string): Promise<CortexAttempt[]> {
  const owner = requireUser(userId);
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.objectStore(STORE_NAME).index('userId');
    const req = index.getAll(owner);
    req.onsuccess = () => { db.close(); resolve(req.result as CortexAttempt[]); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function remove(userId: string, id: string): Promise<void> {
  const owner = requireUser(userId);
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => {
      const attempt = req.result as CortexAttempt | undefined;
      if (attempt?.userId === owner) store.delete(id);
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function clearAll(userId: string): Promise<void> {
  const owner = requireUser(userId);
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('userId');
    const req = index.openCursor(owner);
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) { cursor.delete(); cursor.continue(); }
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
