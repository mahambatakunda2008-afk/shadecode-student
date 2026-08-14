import { offlineStorage, type OfflineSubject } from "@/lib/offline/storage";

export interface LocalSubjectInput {
  id: string;
  userId: string;
  name: string;
}

/**
 * Device-first repository for a student's personal subjects.
 *
 * The repository intentionally has no Supabase dependency. Callers can update
 * the device immediately and let the sync layer reconcile the change later.
 */
export const localSubjects = {
  async list(userId: string): Promise<OfflineSubject[]> {
    return offlineStorage.getSubjectsForUser(userId);
  },

  async get(id: string, userId: string): Promise<OfflineSubject | null> {
    return offlineStorage.getSubjectForUser(id, userId);
  },

  async save(input: LocalSubjectInput): Promise<OfflineSubject> {
    if (!input.userId) throw new Error("Local subject storage requires a userId");

    const name = input.name.trim();
    if (!name) throw new Error("Local subject storage requires a subject name");

    const subject: OfflineSubject = {
      id: input.id,
      userId: input.userId,
      name,
      lastUpdated: new Date().toISOString(),
      synced: false,
    };

    await offlineStorage.saveSubject(subject);
    return subject;
  },
};
