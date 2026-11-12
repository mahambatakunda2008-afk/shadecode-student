import { localFirstStore } from "@/lib/local-first/store";

export interface LocalTimetableSlot {
  subject: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
  color?: string;
}

export interface LocalTimetableState {
  slots: LocalTimetableSlot[];
  updatedAt: string;
}

export const timetableRecordId = (userId: string) => `timetable:${userId}`;

export async function readLocalTimetable(userId: string): Promise<LocalTimetableState | null> {
  if (!userId) return null;
  const record = await localFirstStore.get<LocalTimetableState>(timetableRecordId(userId));
  if (!record || record.userId !== userId || record.deletedAt || !Array.isArray(record.payload?.slots)) return null;
  return record.payload;
}

export async function saveLocalTimetable(userId: string, slots: LocalTimetableSlot[]): Promise<void> {
  if (!userId) throw new Error("Timetable requires an authenticated user");
  if (!Array.isArray(slots) || slots.length === 0) throw new Error("A timetable must contain at least one slot");
  await localFirstStore.upsert({
    id: timetableRecordId(userId),
    entity: "timetable",
    entityId: timetableRecordId(userId),
    userId,
    payload: { slots, updatedAt: new Date().toISOString() } satisfies LocalTimetableState,
  });
}

export async function hasPendingTimetableSync(userId: string): Promise<boolean> {
  if (!userId) return false;
  const pending = await localFirstStore.listPendingOperations(userId);
  return pending.some(operation => operation.entity === "timetable" && operation.entityId === timetableRecordId(userId));
}

export async function acknowledgeTimetableSync(userId: string): Promise<void> {
  if (!userId) return;
  await localFirstStore.acknowledgeEntityOperations(userId, "timetable", timetableRecordId(userId));
}

export async function hydrateTimetableFromServer(userId: string, slots: LocalTimetableSlot[]): Promise<void> {
  if (!userId || await hasPendingTimetableSync(userId)) return;
  await localFirstStore.hydrate({
    id: timetableRecordId(userId),
    entity: "timetable",
    entityId: timetableRecordId(userId),
    userId,
    payload: { slots, updatedAt: new Date().toISOString() } satisfies LocalTimetableState,
    updatedAt: Date.now(),
    deviceId: "server",
    version: 0,
    syncVersion: 0,
  });
}
