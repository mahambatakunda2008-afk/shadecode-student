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
const listeners = new Set<() => void>();
const ACTIVE_STATUSES = new Set<GenerationJobStatus>(["queued", "warming", "generating", "partial"]);
const INTERRUPTIBLE_STATUSES = new Set<GenerationJobStatus>(["warming", "generating", "partial"]);
const DEFAULT_STALE_AFTER_MS = 90_000;
const MAX_JOBS = 30;

function isBrowser() { return typeof window !== "undefined"; }

function read(): GenerationJob<unknown, unknown>[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function write(jobs: GenerationJob<unknown, unknown>[]) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs.slice(-MAX_JOBS)));
    listeners.forEach(listener => listener());
  } catch { /* Generation state must never break the learner experience. */ }
}

function notifyStorageChange() {
  if (isBrowser()) window.dispatchEvent(new CustomEvent("shadecode:cortex:jobs"));
}

export function createGenerationJob<TRequest>(kind: GenerationJob["kind"], request: TRequest): GenerationJob<TRequest> {
  const now = Date.now();
  const id = globalThis.crypto?.randomUUID?.() ?? `${now}-${Math.random().toString(36).slice(2)}`;
  const job: GenerationJob<TRequest> = { id, kind, status: "queued", request, progress: 0, createdAt: now, updatedAt: now, retryCount: 0 };
  write([...read(), job as GenerationJob<unknown, unknown>]);
  notifyStorageChange();
  return job;
}

export function updateGenerationJob<TRequest = unknown, TResult = unknown>(id: string, patch: Partial<GenerationJob<TRequest, TResult>>) {
  const jobs = read();
  const index = jobs.findIndex(job => job.id === id);
  if (index < 0) return null;
  const current = jobs[index];
  jobs[index] = {
    ...current, ...patch,
    progress: typeof patch.progress === "number" ? Math.max(0, Math.min(100, Math.round(patch.progress))) : current.progress,
    updatedAt: Date.now(),
  } as GenerationJob<unknown, unknown>;
  write(jobs);
  notifyStorageChange();
  return jobs[index] as GenerationJob<TRequest, TResult>;
}

export function getGenerationJob(id: string) { return read().find(job => job.id === id) ?? null; }
export function getActiveGenerationJobs() { return read().filter(job => ACTIVE_STATUSES.has(job.status)); }
export function getGenerationJobs() { return read(); }

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

/**
 * Recover only jobs that plausibly died with their previous browser runtime.
 * Freshly queued jobs are intentionally left alone, so mounting Learn cannot
 * manufacture retry counts or reset work that another tab may be starting.
 */
export function markInterruptedJobsForRetry(staleAfterMs = DEFAULT_STALE_AFTER_MS) {
  const jobs = read();
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
  if (changed) { write(next); notifyStorageChange(); }
}

export function cancelGenerationJob(id: string) { return updateGenerationJob(id, { status: "cancelled", error: "Generation cancelled." }); }

export function retryGenerationJob(id: string) {
  const job = getGenerationJob(id);
  if (!job || job.status === "complete" || job.status === "cancelled") return null;
  return updateGenerationJob(id, { status: "queued", progress: 0, error: undefined, retryCount: job.retryCount + 1 });
}
