import { localFirstStore } from "./store";
import { localFirstDB } from "./db";

const syncStateKey = (userId: string, attemptId: string) => `exam-sync-state:${userId}:${attemptId}`;
async function setSyncState(userId: string, attemptId: string, state: "conflict" | "synced" | "pending", revision?: number) {
  await localFirstDB.putMeta({ key: syncStateKey(userId, attemptId), value: JSON.stringify({ state, revision, updatedAt: Date.now() }) });
}

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
    if (response.status === 409 || result?.status === "conflict") { await setSyncState(userId, attemptId, "conflict", result?.revision); return "conflict" as const; }
    if (!response.ok || !result || !["accepted", "already-applied"].includes(result.status ?? "")) return "pending" as const;

    await localFirstStore.acknowledgeEntityOperations(userId, "exam_attempt", attemptId, record.version);
    await setSyncState(userId, attemptId, "synced", result.revision);
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


/** Restore cloud copies only into missing local slots. Existing local work is never overwritten. */
export async function restoreCloudExamAttempts(userId: string): Promise<{ restored: number; skipped: number }> {
  if (!userId || typeof navigator !== "undefined" && !navigator.onLine) return { restored: 0, skipped: 0 };
  const response = await fetch("/api/exam/attempt-sync", { method: "GET", credentials: "same-origin" }).catch(() => null);
  if (!response?.ok) return { restored: 0, skipped: 0 };
  const body = await response.json().catch(() => null) as { attempts?: Array<{ attempt_id: string; client_revision: number; device_id: string; status: "active" | "submitted"; payload: unknown; updated_at: string }> } | null;
  if (!Array.isArray(body?.attempts)) return { restored: 0, skipped: 0 };
  let restored = 0, skipped = 0;
  for (const row of body.attempts) {
    if (!row || typeof row.attempt_id !== "string" || !Number.isSafeInteger(row.client_revision) || row.client_revision < 1 || !row.payload || typeof row.payload !== "object" || (row.payload as { attemptId?: unknown }).attemptId !== row.attempt_id || (row.payload as { userId?: unknown }).userId !== userId) { skipped++; continue; }
    const id = `exam_attempt:${userId}:${row.attempt_id}`;
    const existing = await localFirstStore.get(id);
    if (existing) { skipped++; continue; }
    await localFirstStore.hydrate({ id, entity: "exam_attempt", entityId: row.attempt_id, userId, payload: row.payload, updatedAt: Date.parse(row.updated_at) || Date.now(), deviceId: row.device_id, version: row.client_revision, syncVersion: row.client_revision });
    restored++;
  }
  return { restored, skipped };
}
