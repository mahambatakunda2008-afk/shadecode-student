import type { GenerationJob } from "@/lib/cortex/generationJob";

type DurableEvent = "created" | "progress" | "complete" | "failed" | "cancelled";

function isBrowser() {
  return typeof window !== "undefined";
}

export async function syncDurableGenerationJob(
  token: string,
  job: GenerationJob,
  event: DurableEvent,
) {
  if (!isBrowser() || !token || !job?.id) return;

  try {
    await fetch("/api/cortex/generation", {
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
        retryCount: job.retryCount,
      }),
      keepalive: event !== "progress",
    });
  } catch {
    // Browser-local generation must never become dependent on the durability endpoint.
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
