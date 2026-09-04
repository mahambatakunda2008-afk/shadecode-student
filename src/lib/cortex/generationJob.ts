export type GenerationJobStatus =
  | "queued"
  | "warming"
  | "generating"
  | "partial"
  | "complete"
  | "failed"
  | "cancelled";

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

const STORAGE_KEY = "shadecode:cortex:generation-jobs:v1";
const listeners = new Set<() => void>();

function isBrowser() {
  return typeof window !== "undefined";
}

function read(): GenerationJob[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(jobs: GenerationJob[]) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs.slice(-30)));
    listeners.forEach((listener) => listener());
  } catch {
    // Persistence must never break generation UX.
  }
}

export function createGenerationJob<TRequest>(
  kind: GenerationJob["kind"],
  request: TRequest,
): GenerationJob<TRequest> {
  const now = Date.now();
  const job: GenerationJob<TRequest> = {
    id: globalThis.crypto?.randomUUID?.() ?? `${now}-${Math.random().toString(36).slice(2)}`,
    kind,
    status: "queued",
    request,
    progress: 0,
    createdAt: now,
    updatedAt: now,
    retryCount: 0,
  };
  write([...read(), job]);
  return job;
}

export function updateGenerationJob<T = unknown>(
  id: string,
  patch: Partial<GenerationJob<Record<string, unknown>, T>>,
) {
  const jobs = read();
  const index = jobs.findIndex((job) => job.id === id);
  if (index < 0) return null;
  const current = jobs[index];
  jobs[index] = {
    ...current,
    ...patch,
    progress:
      typeof patch.progress === "number"
        ? Math.max(0, Math.min(100, Math.round(patch.progress)))
        : current.progress,
    updatedAt: Date.now(),
  };
  write(jobs);
  return jobs[index];
}

export function getGenerationJob(id: string) {
  return read().find((job) => job.id === id) ?? null;
}

export function getActiveGenerationJobs() {
  return read().filter((job) =>
    ["queued", "warming", "generating", "partial"].includes(job.status),
  );
}

export function getGenerationJobs() {
  return read();
}

export function subscribeGenerationJobs(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function markInterruptedJobsForRetry() {
  const jobs = read();
  let changed = false;
  const next = jobs.map((job) => {
    if (["queued", "warming", "generating", "partial"].includes(job.status)) {
      changed = true;
      return {
        ...job,
        status: "queued" as const,
        progress: Math.min(job.progress, 90),
        retryCount: job.retryCount + 1,
        updatedAt: Date.now(),
      };
    }
    return job;
  });
  if (changed) write(next);
}
