import { localFirstDB } from "./db";
import type { LocalEntity, LocalOperation, LocalRecord, SyncBundle, SyncResult } from "./types";

export interface LocalProgress {
  lessonId: string;
  userId: string;
  completed: boolean;
  progress: number;
  quizScore?: number;
  lastUpdated: string;
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function progressRecordId(userId: string, lessonId: string): string {
  return `progress:${userId}:${lessonId}`;
}

async function getDeviceId(): Promise<string> {
  return localFirstDB.getOrCreateDeviceId(createId);
}

function compareRecords(a: LocalRecord, b: LocalRecord): number {
  if (a.version !== b.version) return a.version - b.version;
  if (a.updatedAt !== b.updatedAt) return a.updatedAt - b.updatedAt;
  return a.deviceId.localeCompare(b.deviceId);
}

export class LocalFirstStore {
  async deviceId(): Promise<string> { return getDeviceId(); }
  async get<T>(id: string): Promise<LocalRecord<T> | null> { return localFirstDB.getRecord<T>(id); }
  async list(userId: string): Promise<LocalRecord[]> { return localFirstDB.getRecords(userId); }
  async listOperations(userId: string): Promise<LocalOperation[]> { return localFirstDB.getOperations(userId); }
  async listPendingOperations(userId: string): Promise<LocalOperation[]> { return localFirstDB.getPendingOperations(userId); }
  async acknowledgeOperation(id: string): Promise<void> { await localFirstDB.markOperationSynced(id); }

  async acknowledgeEntityOperations(userId: string, entity: LocalEntity, entityId: string, throughLamport?: number): Promise<void> {
    const pending = await localFirstDB.getPendingOperations(userId);
    for (const operation of pending) {
      if (operation.entity !== entity || operation.entityId !== entityId) continue;
      if (throughLamport !== undefined && operation.lamport > throughLamport) continue;
      await localFirstDB.markOperationSynced(operation.id);
    }
  }

  /** Server hydration never creates a local mutation. */
  async hydrate<T>(record: LocalRecord<T>): Promise<void> {
    if (!record.userId) throw new Error("Local hydration requires an authenticated user");
    const existing = await localFirstDB.getRecord<T>(record.id);
    if (existing && existing.userId !== record.userId) throw new Error("Refusing to hydrate a record owned by another user");
    if (!existing || compareRecords(record, existing) > 0) await localFirstDB.putRecord(record);
  }

  /** Local mutation with atomic clock allocation + record + operation persistence. */
  async upsert<T>(input: { id?: string; entity: LocalEntity; userId: string; payload: T }): Promise<LocalRecord<T>> {
    if (!input.userId) throw new Error("Local mutation requires an authenticated user");
    const id = input.id ?? createId();
    return localFirstDB.mutateRecord({ id, entity: input.entity, userId: input.userId, payload: input.payload, deviceId: await getDeviceId() });
  }

  /** Local progress mutation. The physical key is user-scoped while entityId remains the lesson ID. */
  async saveProgress(progress: LocalProgress): Promise<LocalRecord<LocalProgress>> {
    if (!progress.userId || !progress.lessonId) throw new Error("Progress requires an authenticated user and lesson");
    const id = progressRecordId(progress.userId, progress.lessonId);
    const payload = { ...progress, lastUpdated: progress.lastUpdated || new Date().toISOString() };
    return localFirstDB.mutateRecord({ id, entity: "progress", userId: progress.userId, payload, deviceId: await getDeviceId() });
  }

  /** Server hydration for progress. Unlike saveProgress, this cannot create a pending operation. */
  async hydrateProgress(progress: LocalProgress, updatedAt?: number): Promise<void> {
    if (!progress.userId || !progress.lessonId) throw new Error("Progress hydration requires an authenticated user and lesson");
    await this.hydrate({
      id: progressRecordId(progress.userId, progress.lessonId),
      entity: "progress",
      userId: progress.userId,
      payload: progress,
      updatedAt: updatedAt ?? (Date.parse(progress.lastUpdated) || Date.now()),
      deviceId: "server",
      version: 0,
    });
  }

  async getProgress(lessonId: string, userId: string): Promise<LocalProgress | null> {
    if (!lessonId || !userId) return null;
    const record = await localFirstDB.getRecord<LocalProgress>(progressRecordId(userId, lessonId));
    if (!record || record.userId !== userId || record.deletedAt) return null;
    return record.payload;
  }

  async listPendingProgress(userId: string): Promise<LocalProgress[]> {
    if (!userId) return [];
    const operations = await localFirstDB.getPendingOperations(userId);
    const progressIds = new Set(operations.filter((op) => op.entity === "progress" && op.kind !== "delete").map((op) => op.entityId));
    const result: LocalProgress[] = [];
    for (const lessonId of progressIds) {
      const progress = await this.getProgress(lessonId, userId);
      if (progress) result.push(progress);
    }
    return result;
  }

  async acknowledgeProgress(userId: string, lessonId: string): Promise<void> {
    await this.acknowledgeEntityOperations(userId, "progress", lessonId);
  }

  async remove(input: { id: string; entity: LocalEntity; userId: string }): Promise<void> {
    if (!input.userId) throw new Error("Local mutation requires an authenticated user");
    await localFirstDB.mutateRecord({
      id: input.id,
      entity: input.entity,
      userId: input.userId,
      payload: null,
      deviceId: await getDeviceId(),
      deletedAt: Date.now(),
    });
  }

  async exportBundle(userId: string): Promise<SyncBundle> {
    if (!userId) throw new Error("Cannot export a bundle without an authenticated user");
    const [records, operations, deviceId, lamportMeta] = await Promise.all([localFirstDB.getRecords(userId), localFirstDB.getOperations(userId), getDeviceId(), localFirstDB.getMeta("lamport")]);
    const sequenceMeta = await localFirstDB.getMeta(`sequence:${deviceId}`);
    return { version: 2, exportedAt: Date.now(), userId, deviceId, lamport: typeof lamportMeta?.value === "number" ? lamportMeta.value : 0, sequence: typeof sequenceMeta?.value === "number" ? sequenceMeta.value : 0, records, operations };
  }

  async importBundle(bundle: SyncBundle, expectedUserId?: string): Promise<SyncResult> {
    if (bundle.version !== 2) throw new Error("Unsupported Shadecode sync bundle version");
    if (expectedUserId && bundle.userId !== expectedUserId) throw new Error("This sync bundle belongs to a different account");
    if (!bundle.userId) throw new Error("Sync bundle has no owner");
    let imported = 0; let skipped = 0; let conflicts = 0;
    const localOperations = await localFirstDB.getOperations(bundle.userId);
    const knownOperationIds = new Set(localOperations.map((operation) => operation.id));
    for (const operation of bundle.operations) {
      if (operation.userId !== bundle.userId) throw new Error("Sync bundle contains an operation owned by another user");
      if (!knownOperationIds.has(operation.id)) await localFirstDB.putOperation({ ...operation, syncedAt: operation.syncedAt ?? new Date().toISOString() });
    }
    for (const remote of bundle.records) {
      if (remote.userId !== bundle.userId) throw new Error("Sync bundle contains a record owned by another user");
      const local = await localFirstDB.getRecord(remote.id);
      if (local && local.userId !== bundle.userId) throw new Error("Sync bundle attempts to overwrite another user's local record");
      if (!local) { await localFirstDB.putRecord(remote); imported += 1; continue; }
      const comparison = compareRecords(remote, local);
      if (comparison > 0) { await localFirstDB.putRecord(remote); imported += 1; if (local.deviceId !== remote.deviceId) conflicts += 1; }
      else skipped += 1;
    }
    const localLamport = await localFirstDB.getMeta("lamport");
    if (bundle.lamport > (typeof localLamport?.value === "number" ? localLamport.value : 0)) await localFirstDB.putMeta({ key: "lamport", value: bundle.lamport });
    return { imported, skipped, conflicts };
  }

  async clearUser(userId: string): Promise<void> { if (userId) await localFirstDB.clearUser(userId); }
}

export const localFirstStore = new LocalFirstStore();