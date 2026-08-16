import { offlineStorage, type OfflineSubject } from "@/lib/offline/storage";
import { localOperationStore } from "./operation-store";
import { createOperationId } from "./operations";
import { getDeviceId } from "./device";

export interface LocalSubjectInput { id: string; userId: string; name: string; }

const sequenceKey = "shadecode:operation-sequence";
async function nextSequence(): Promise<number> {
  if (typeof window === "undefined") return Date.now();
  const next = Number(window.localStorage.getItem(sequenceKey) || "0") + 1;
  window.localStorage.setItem(sequenceKey, String(next));
  return next;
}

async function record(userId: string, entityId: string, kind: "create" | "update", payload: unknown): Promise<void> {
  const deviceId = getDeviceId();
  const sequence = await nextSequence();
  await localOperationStore.append({ id: createOperationId(deviceId, sequence), deviceId, userId, entity: "subject", entityId, kind, payload, timestamp: new Date().toISOString(), sequence });
}

export const localSubjects = {
  async list(userId: string): Promise<OfflineSubject[]> { return offlineStorage.getSubjectsForUser(userId); },
  async get(id: string, userId: string): Promise<OfflineSubject | null> { return offlineStorage.getSubjectForUser(id, userId); },
  async save(input: LocalSubjectInput): Promise<OfflineSubject> {
    if (!input.userId) throw new Error("Local subject storage requires a userId");
    const name = input.name.trim();
    if (!name) throw new Error("Local subject storage requires a subject name");
    const existing = await offlineStorage.getSubjectForUser(input.id, input.userId);
    const subject: OfflineSubject = { id: input.id, userId: input.userId, name, lastUpdated: new Date().toISOString(), synced: false };
    await offlineStorage.saveSubject(subject);
    await record(input.userId, input.id, existing ? "update" : "create", subject);
    return subject;
  },
};
