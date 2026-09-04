export type GenerationJobStatus =
  | "queued" | "warming" | "generating" | "partial" | "complete" | "failed" | "cancelled";

export interface GenerationJob<TRequest = Record<string, unknown>, TResult = unknown> {
  id: string;
  kind: "lesson" | "course" | "revision" | "exam";
  status: GenerationJobStatus;
  request: TRequest;
  result?: TResult;
  partial?: unknown;
  progress: number;
  createdAt: number;
  updatedAt: number;
  error?: string;
  retryCount: number;
}

const STORAGE_KEY = "shadecode:cortex:generation-jobs:v2";
const ACTIVE_KEY = "shadecode:cortex:generation-jobs:active:v1";
const DB_NAME = "shadecode-cortex";
const DB_VERSION = 1;
const STORE_NAME = "generationJobs";
const listeners = new Set<() => void>();
const ACTIVE_STATUSES = new Set<GenerationJobStatus>(["queued", "warming", "generating", "partial"]);
const INTERRUPTIBLE_STATUSES = new Set<GenerationJobStatus>(["warming", "generating", "partial"]);
const DEFAULT_STALE_AFTER_MS = 90_000;
const MAX_JOBS = 30;
const COMPACT_JOB_KEYS: Array<keyof GenerationJob> = ["id", "kind", "status", "request", "progress", "createdAt", "updatedAt", "error", "retryCount"];

let memoryJobs: GenerationJob<unknown, unknown>[] | null = null;
let hydrationPromise: Promise<void> | null = null;
let dbPromise: Promise<IDBDatabase | null> | null = null;

function isBrowser() { return typeof window !== "undefined"; }

function compactJob(job: GenerationJob<unknown, unknown>): GenerationJob<unknown, unknown> {
  const compact = {} as GenerationJob<unknown, unknown>;
  for (const key of COMPACT_JOB_KEYS) {
    if (job[key] !== undefined) (compact as unknown as Record<string, unknown>)[key] = job[key];
  }
  return compact;
}

function normalizeJobs(value: unknown): GenerationJob<unknown, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((job): job is GenerationJob<unknown, unknown> => Boolean(job && typeof job === "object" && typeof (job as GenerationJob).id === "string"))
    .map(job => ({ ...job, progress: Math.max(0, Math.min(100, Math.round(Number(job.progress) || 0))), retryCount: Math.max(0, Number(job.retryCount) || 0) }))
    .sort((a, b) => a.updatedAt - b.updatedAt)
    .slice(-MAX_JOBS);
}

function readLegacy(): GenerationJob<unknown, unknown>[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeJobs(JSON.parse(raw)) : [];
  } catch { return []; }
}

function readActiveId(): string | null {
  if (!isBrowser()) return null;
  try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; }
}

function writeCompact(jobs: GenerationJob<unknown, unknown>[]) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs.map(compactJob).slice(-MAX_JOBS)));
  } catch { /* IndexedDB is the durable source; localStorage is only a fallback/coordination layer. */ }
}

function notifyStorageChange() {
  if (isBrowser()) window.dispatchEvent(new CustomEvent("shadecode:cortex:jobs"));
}

function notifyListeners() {
  listeners.forEach(listener => listener());
  notifyStorageChange();
}

function getMemoryJobs() {
  if (!memoryJobs) memoryJobs = readLegacy();
  return memoryJobs;
}

async function openDb(): Promise<IDBDatabase | null> {
  if (!isBrowser() || typeof indexedDB === "undefined") return null;
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt", { unique: false });
          store.createIndex("status", "status", { unique: false });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
    } catch { resolve(null); }
  });
  return dbPromise;
}

async function readDurableJobs(): Promise<GenerationJob<unknown, unknown>[]> {
  const db = await openDb();
  if (!db) return [];
  return new Promise(resolve => {
    try {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
      request.onerror = () => resolve([]);
      request.onsuccess = () => resolve(normalizeJobs(request.result));
    } catch { resolve([]); }
  });
}

async function putDurableJob(job: GenerationJob<unknown, unknown>) {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>(resolve => {
    try {
      const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(job);
      request.onerror = () => resolve();
      request.onsuccess = () => resolve();
    } catch { resolve(); }
  });
}

async function putDurableJobs(jobs: GenerationJob<unknown, unknown>[]) {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>(resolve => {
    try {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      jobs.slice(-MAX_JOBS).forEach(job => store.put(job));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
      transaction.onabort = () => resolve();
    } catch { resolve(); }
  });
}

function persistMutation(job: GenerationJob<unknown, unknown>) {
  writeCompact(getMemoryJobs());
  void putDurableJob(job);
}

export async function hydrateGenerationJobs() {
  if (!isBrowser()) return;
  if (hydrationPromise) return hydrationPromise;
  hydrationPromise = (async () => {
    const legacy = getMemoryJobs();
    const durable = await readDurableJobs();
    const byId = new Map<string, GenerationJob<unknown, unknown>>();
    [...legacy, ...durable].forEach(job => {
      const current = byId.get(job.id);
      if (!current || job.updatedAt >= current.updatedAt) byId.set(job.id, job);
    });
    memoryJobs = Array.from(byId.values()).sort((a, b) => a.updatedAt - b.updatedAt).slice(-MAX_JOBS);
    if (legacy.length) await putDurableJobs(legacy);
    writeCompact(memoryJobs);
    notifyListeners();
  })().finally(() => { hydrationPromise = null; });
  return hydrationPromise;
}

export function createGenerationJob<TRequest>(kind: GenerationJob["kind"], request: TRequest): GenerationJob<TRequest> {
  const now = Date.now();
  const id = globalThis.crypto?.randomUUID?.() ?? `${now}-${Math.random().toString(36).slice(2)}`;
  const job: GenerationJob<TRequest> = { id, kind, status: "queued", request, progress: 0, createdAt: now, updatedAt: now, retryCount: 0 };
  memoryJobs = [...getMemoryJobs(), job as GenerationJob<unknown, unknown>].slice(-MAX_JOBS);
  persistMutation(job as GenerationJob<unknown, unknown>);
  notifyListeners();
  return job;
}

export function updateGenerationJob<TRequest = unknown, TResult = unknown>(id: string, patch: Partial<GenerationJob<TRequest, TResult>>) {
  const jobs = getMemoryJobs();
  const index = jobs.findIndex(job => job.id === id);
  if (index < 0) return null;
  const current = jobs[index];
  jobs[index] = {
    ...current, ...patch,
    progress: typeof patch.progress === "number" ? Math.max(0, Math.min(100, Math.round(patch.progress))) : current.progress,
    updatedAt: Date.now(),
  } as GenerationJob<unknown, unknown>;
  persistMutation(jobs[index]);
  notifyListeners();
  return jobs[index] as GenerationJob<TRequest, TResult>;
}

export function getGenerationJob(id: string) { return getMemoryJobs().find(job => job.id === id) ?? null; }
export function getActiveGenerationJobs() { return getMemoryJobs().filter(job => ACTIVE_STATUSES.has(job.status)); }
export function getGenerationJobs() { return getMemoryJobs(); }

export function subscribeGenerationJobs(listener: () => void) {
  listeners.add(listener);
  if (isBrowser()) window.addEventListener("storage", listener);
  if (isBrowser()) window.addEventListener("shadecode:cortex:jobs", listener);
  return () => {
    listeners.delete(listener);
    if (isBrowser()) window.removeEventListener("storage", listener);
    if (isBrowser()) window.removeEventListener("shadecode:cortex:jobs", listener);
  };
}

export function markInterruptedJobsForRetry(staleAfterMs = DEFAULT_STALE_AFTER_MS) {
  const jobs = getMemoryJobs();
  const now = Date.now();
  let changed = false;
  const next = jobs.map(job => {
    const stale = now - job.updatedAt >= staleAfterMs;
    if (!INTERRUPTIBLE_STATUSES.has(job.status) || !stale) return job;
    changed = true;
    return {
      ...job,
      status: "queued" as const,
      progress: Math.min(job.progress, 90),
      retryCount: job.retryCount + 1,
      updatedAt: now,
      error: "Previous generation run stopped. Cortex will resume this request.",
    };
  });
  if (changed) {
    memoryJobs = next;
    next.filter(job => job.updatedAt === now).forEach(job => persistMutation(job));
    notifyListeners();
  }
}

export function cancelGenerationJob(id: string) { return updateGenerationJob(id, { status: "cancelled", error: "Generation cancelled." }); }

export function retryGenerationJob(id: string) {
  const job = getGenerationJob(id);
  if (!job || job.status === "complete" || job.status === "cancelled") return null;
  return updateGenerationJob(id, { status: "queued", progress: 0, error: undefined, retryCount: job.retryCount + 1 });
}

export function setActiveGenerationJobId(id: string | null) {
  if (!isBrowser()) return;
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch { /* best effort coordination only */ }
}

export function getActiveGenerationJobId() { return readActiveId(); }
