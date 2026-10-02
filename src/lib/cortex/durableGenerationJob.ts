import type { GenerationJob } from "@/lib/cortex/generationJob";

type DurableEvent = "created" | "progress" | "complete" | "failed" | "cancelled";

function isBrowser() {
  return typeof window !== "undefined";
}

function checkpointUnits<TRequest, TResult>(job: GenerationJob<TRequest, TResult>) {
  const partial = job.partial && typeof job.partial === "object" ? job.partial as Record<string, unknown> : null;
  return {
    completedUnits: typeof partial?.completedUnits === "number" ? partial.completedUnits : undefined,
    totalUnits: typeof partial?.totalUnits === "number" ? partial.totalUnits : undefined,
  };
}

export async function syncDurableGenerationJob<TRequest, TResult>(
  token: string,
  job: GenerationJob<TRequest, TResult>,
  event: DurableEvent,
  options: { leaseId?: string; releaseLease?: boolean; heartbeatOnly?: boolean } = {},
) {
  if (!isBrowser() || !token || !job?.id) return false;

  try {
    const units = checkpointUnits(job);
    const response = await fetch("/api/cortex/generation", {
      method: event === "created" ? "POST" : "PATCH",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        event,
        id: job.id,
        kind: job.kind,
        status: job.status,
        stage: job.status,
        request: event === "created" ? job.request : undefined,
        partial: job.partial,
        result: job.result,
        error: job.error ? { message: job.error } : null,
        progress: job.progress,
        completedUnits: units.completedUnits,
        totalUnits: units.totalUnits,
        retryCount: job.retryCount,
        leaseId: options.leaseId,
        releaseLease: options.releaseLease === true,
        heartbeatOnly: options.heartbeatOnly === true,
      }),
      keepalive: event !== "progress",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getDurableGenerationJob(token: string, id: string) {
  if (!isBrowser() || !token || !id) return null;
  try {
    const response = await fetch(`/api/cortex/generation?id=${encodeURIComponent(id)}`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return await response.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function listDurableGenerationJobs(token: string) {
  if (!isBrowser() || !token) return [];
  try {
    const response = await fetch("/api/cortex/generation", {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return [];
    const data = await response.json() as { jobs?: unknown };
    return Array.isArray(data.jobs) ? data.jobs : [];
  } catch {
    return [];
  }
}
