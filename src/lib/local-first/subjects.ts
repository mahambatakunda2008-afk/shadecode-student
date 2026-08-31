import { offlineStorage, type OfflineSubject } from "@/lib/offline/storage";
import { localFirstStore } from "./store";

export interface LocalSubjectInput { id: string; userId: string; name: string; }

export const localSubjects = {
  async list(userId: string): Promise<OfflineSubject[]> { return offlineStorage.getSubjectsForUser(userId); },
  async get(id: string, userId: string): Promise<OfflineSubject | null> { return offlineStorage.getSubjectForUser(id, userId); },
  async save(input: LocalSubjectInput): Promise<OfflineSubject> {
    if (!input.userId) throw new Error("Local subject storage requires a userId");
    const name = input.name.trim();
    if (!name) throw new Error("Local subject storage requires a subject name");
    const subject: OfflineSubject = { id: input.id, userId: input.userId, name, lastUpdated: new Date().toISOString(), synced: false };
    await offlineStorage.saveSubject(subject);
    await localFirstStore.upsert({ id: subject.id, entity: "subject", userId: subject.userId, payload: subject });
    return subject;
  },
  async remove(id: string, userId: string): Promise<void> {
    const subject = await offlineStorage.getSubjectForUser(id, userId);
    if (!subject) return;
    await offlineStorage.deleteSubject(id, userId);
    await localFirstStore.remove({ id, entity: "subject", userId });
  },
};
