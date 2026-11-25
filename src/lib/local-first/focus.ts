import { localFirstStore } from "@/lib/local-first/store";

export interface FocusSessionSnapshot {
  presetIndex: number;
  customMinutes: number;
  remainingSeconds: number;
  durationSeconds: number;
  isRunning: boolean;
  startedAt: number | null;
  isFinished: boolean;
  updatedAt: string;
}

export interface FocusDailyStats {
  sessions: number;
  minutes: number;
}

export const focusSessionRecordId = (userId: string) => `focus-session:${userId}`;
export const focusStatsRecordId = (userId: string, day: string) => `focus-stats:${userId}:${day}`;

export function isFocusRecordOwnedBy(record: { userId?: string } | null | undefined, userId: string): boolean {
  return Boolean(userId && record?.userId === userId);
}

export async function readFocusSession(userId: string): Promise<FocusSessionSnapshot | null> {
  if (!userId) return null;
  const record = await localFirstStore.get<FocusSessionSnapshot>(focusSessionRecordId(userId));
  if (!record || !isFocusRecordOwnedBy(record, userId) || record.entity !== "study_session" || record.deletedAt) return null;
  const value = record.payload;
  if (!value || !Number.isFinite(value.remainingSeconds) || !Number.isFinite(value.durationSeconds)) return null;
  return value;
}

export async function saveFocusSession(userId: string, snapshot: FocusSessionSnapshot): Promise<void> {
  if (!userId) throw new Error("Focus session requires an authenticated user");
  const id = focusSessionRecordId(userId);
  const existing = await localFirstStore.get<FocusSessionSnapshot>(id);
  if (existing && existing.userId !== userId) throw new Error("Refusing to overwrite another user's focus session");
  await localFirstStore.hydrate({
    id, entity: "study_session", entityId: id, userId, payload: snapshot,
    updatedAt: Date.now(), deviceId: existing?.deviceId ?? await localFirstStore.deviceId(),
    version: (existing?.version ?? 0) + 1, syncVersion: existing?.syncVersion ?? 0,
  });
}

export async function clearFocusSession(userId: string): Promise<void> {
  if (!userId) return;
  const id = focusSessionRecordId(userId);
  const existing = await localFirstStore.get<FocusSessionSnapshot>(id);
  if (!existing || !isFocusRecordOwnedBy(existing, userId) || existing.deletedAt) return;
  await localFirstStore.hydrate({ ...existing, updatedAt: Date.now(), version: existing.version + 1, deletedAt: Date.now() });
}

export async function readFocusDailyStats(userId: string, day: string): Promise<FocusDailyStats> {
  if (!userId || !day) return { sessions: 0, minutes: 0 };
  const id = focusStatsRecordId(userId, day);
  const record = await localFirstStore.get<FocusDailyStats>(id);
  if (!record || !isFocusRecordOwnedBy(record, userId) || record.entity !== "study_session" || record.deletedAt) return { sessions: 0, minutes: 0 };
  return {
    sessions: Math.max(0, Number(record.payload?.sessions) || 0),
    minutes: Math.max(0, Number(record.payload?.minutes) || 0),
  };
}

export async function saveFocusDailyStats(userId: string, day: string, stats: FocusDailyStats): Promise<void> {
  if (!userId || !day) throw new Error("Focus statistics require an authenticated user and day");
  const id = focusStatsRecordId(userId, day);
  const existing = await localFirstStore.get<FocusDailyStats>(id);
  if (existing && existing.userId !== userId) throw new Error("Refusing to overwrite another user's focus statistics");
  await localFirstStore.hydrate({
    id, entity: "study_session", entityId: id, userId,
    payload: { sessions: Math.max(0, stats.sessions), minutes: Math.max(0, stats.minutes) },
    updatedAt: Date.now(), deviceId: existing?.deviceId ?? await localFirstStore.deviceId(),
    version: (existing?.version ?? 0) + 1, syncVersion: existing?.syncVersion ?? 0,
  });
}
