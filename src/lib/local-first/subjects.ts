import type { OfflineSubject } from "@/lib/offline/storage";
import { localFirstStore } from "./store";

export interface LocalSubjectInput { id: string; userId: string; name: string; }

function toSubject(record: { id: string; userId: string; payload: unknown; deletedAt?: number }): OfflineSubject | null {
  if (record.deletedAt || !record.payload || typeof record.payload !== "object") return null;
  const value = record.payload as Partial<OfflineSubject>;
  return {
    id: record.id,
    userId: record.userId,
    name: typeof value.name === "string" ? value.name : "",
    lastUpdated: typeof value.lastUpdated === "string" ? value.lastUpdated : new Date().toISOString(),
    synced: Boolean(value.synced),
  };
}

export const localSubjects = {
  async list(userId: string): Promise<OfflineSubject[]> {
    const records = await localFirstStore.list(userId);
    return records.filter((record) => record.entity === "subject").map(toSubject).filter((subject): subject is OfflineSubject => subject !== null);
  },
  async get(id: string, userId: string): Promise<OfflineSubject | null> {
    const record = await localFirstStore.get(id);
    if (!record || record.userId !== userId || record.entity !== "subject") return null;
    return toSubject(record);
  },
  async save(input: LocalSubjectInput): Promise<OfflineSubject> {
    if (!input.userId) throw new Error("Local subject storage requires a userId");
    const name = input.name.trim();
    if (!name) throw new Error("Local subject storage requires a subject name");
    const subject: OfflineSubject = { id: input.id, userId: input.userId, name, lastUpdated: new Date().toISOString(), synced: false };
    await localFirstStore.upsert({ id: subject.id, entity: "subject", userId: subject.userId, payload: subject });
    return subject;
  },
  async remove(id: string, userId: string): Promise<void> {
    const subject = await localSubjects.get(id, userId);
    if (!subject) return;
    await localFirstStore.remove({ id, entity: "subject", userId });
  },
};
