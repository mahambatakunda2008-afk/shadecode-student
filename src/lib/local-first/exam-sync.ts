import { localFirstStore } from "./store";

const inFlight = new Map<string, Promise<"synced" | "pending" | "conflict">>();
const lastAttemptedAt = new Map<string, number>();
const MIN_RETRY_INTERVAL_MS = 8_000;

export async function syncExamAttempt(
  userId: string,
  attemptId: string,
  options: { force?: boolean } = {},
): Promise<"synced" | "pending" | "conflict"> {
  if (!userId || !attemptId || typeof navigator !== "undefined" && !navigator.onLine) return "pending";
  const key = `${userId}:${attemptId}`;
  const active = inFlight.get(key);
  if (active) return active;
  if (!options.force && Date.now() - (lastAttemptedAt.get(key) ?? 0) < MIN_RETRY_INTERVAL_MS) return "pending";

  const task = (async () => {
    lastAttemptedAt.set(key, Date.now());
    const recordId = `exam_attempt:${userId}:${attemptId}`;
    const record = await localFirstStore.get<{
      attemptId: string;
      status: "active" | "submitted";
    }>(recordId);
    if (!record || record.userId !== userId || record.deletedAt || record.payload?.attemptId !== attemptId) return "pending" as const;

    const response = await fetch("/api/exam/attempt-sync", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attemptId,
        clientRevision: record.version,
        deviceId: record.deviceId,
        status: record.payload.status,
        payload: record.payload,
      }),
    }).catch(() => null);

    if (!response) return "pending" as const;
    const result = await response.json().catch(() => null) as { status?: string; revision?: number } | null;
    if (response.status === 409 || result?.status === "conflict") return "conflict" as const;
    if (!response.ok || !result || !["accepted", "already-applied"].includes(result.status ?? "")) return "pending" as const;

    await localFirstStore.acknowledgeEntityOperations(userId, "exam_attempt", attemptId, record.version);
    if (typeof result.revision === "number") {
      await localFirstStore.markRecordSynced(userId, "exam_attempt", attemptId, result.revision);
    }
    return "synced" as const;
  })().finally(() => inFlight.delete(key));

  inFlight.set(key, task);
  return task;
}

export async function syncPendingExamAttempts(userId: string): Promise<void> {
  if (!userId || typeof navigator !== "undefined" && !navigator.onLine) return;
  const operations = await localFirstStore.listPendingOperations(userId).catch(() => []);
  const attemptIds = [...new Set(operations
    .filter((operation) => operation.entity === "exam_attempt" && operation.userId === userId)
    .map((operation) => operation.entityId))];
  for (const attemptId of attemptIds) {
    await syncExamAttempt(userId, attemptId);
  }
}
