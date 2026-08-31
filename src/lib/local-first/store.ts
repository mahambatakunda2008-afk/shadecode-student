import { localFirstDB } from "./db";
import { createOperationId } from "./operations";
import type { LocalEntity, LocalOperation, LocalRecord, SyncBundle, SyncResult } from "./types";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function getDeviceId(): Promise<string> {
  const existing = await localFirstDB.getMeta("deviceId");
  if (typeof existing?.value === "string") return existing.value;
  const deviceId = createId();
  await localFirstDB.putMeta({ key: "deviceId", value: deviceId });
  return deviceId;
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

  async upsert<T>(input: { id?: string; entity: LocalEntity; userId: string; payload: T }): Promise<LocalRecord<T>> {
    const deviceId = await getDeviceId();
    const id = input.id ?? createId();
    const existing = await localFirstDB.getRecord<T>(id);
    const clock = await localFirstDB.nextClock(deviceId, existing?.version ?? 0);
    const now = Date.now();
    const record: LocalRecord<T> = { id, entity: input.entity, userId: input.userId, payload: input.payload, updatedAt: now, deviceId, version: clock.lamport };
    const operation: LocalOperation<T> = {
      id: createOperationId(deviceId, clock.sequence), recordId: id, entity: input.entity, entityId: id,
      userId: input.userId, deviceId, kind: existing ? "update" : "create", payload: input.payload,
      timestamp: new Date(now).toISOString(), sequence: clock.sequence, lamport: clock.lamport,
    };
    await localFirstDB.putRecordAndOperation(record, operation);
    return record;
  }

  async remove(input: { id: string; entity: LocalEntity; userId: string }): Promise<void> {
    const deviceId = await getDeviceId();
    const existing = await localFirstDB.getRecord(input.id);
    const clock = await localFirstDB.nextClock(deviceId, existing?.version ?? 0);
    const now = Date.now();
    const tombstone: LocalRecord = { id: input.id, entity: input.entity, userId: input.userId, payload: null, updatedAt: now, deviceId, version: clock.lamport, deletedAt: now };
    const operation: LocalOperation = {
      id: createOperationId(deviceId, clock.sequence), recordId: input.id, entity: input.entity, entityId: input.id,
      userId: input.userId, deviceId, kind: "delete", timestamp: new Date(now).toISOString(), sequence: clock.sequence, lamport: clock.lamport,
    };
    await localFirstDB.putRecordAndOperation(tombstone, operation);
  }

  async exportBundle(userId: string): Promise<SyncBundle> {
    const [records, operations, deviceId, lamportMeta] = await Promise.all([localFirstDB.getRecords(userId), localFirstDB.getOperations(userId), getDeviceId(), localFirstDB.getMeta("lamport")]);
    const sequenceMeta = await localFirstDB.getMeta(`sequence:${deviceId}`);
    return { version: 2, exportedAt: Date.now(), userId, deviceId, lamport: typeof lamportMeta?.value === "number" ? lamportMeta.value : 0, sequence: typeof sequenceMeta?.value === "number" ? sequenceMeta.value : 0, records, operations };
  }

  async importBundle(bundle: SyncBundle, expectedUserId?: string): Promise<SyncResult> {
    if (bundle.version !== 2) throw new Error("Unsupported Shadecode sync bundle version");
    if (expectedUserId && bundle.userId !== expectedUserId) throw new Error("This sync bundle belongs to a different account");
    let imported = 0; let skipped = 0; let conflicts = 0;
    const localOperations = await localFirstDB.getOperations(bundle.userId);
    const knownOperationIds = new Set(localOperations.map((operation) => operation.id));
    for (const operation of bundle.operations) {
      if (!knownOperationIds.has(operation.id)) await localFirstDB.putOperation({ ...operation, syncedAt: operation.syncedAt ?? new Date().toISOString() });
    }
    for (const remote of bundle.records) {
      const local = await localFirstDB.getRecord(remote.id);
      if (!local) { await localFirstDB.putRecord(remote); imported += 1; continue; }
      const comparison = compareRecords(remote, local);
      if (comparison > 0) { await localFirstDB.putRecord(remote); imported += 1; if (local.deviceId !== remote.deviceId) conflicts += 1; }
      else skipped += 1;
    }
    const localLamport = await localFirstDB.getMeta("lamport");
    if (bundle.lamport > (typeof localLamport?.value === "number" ? localLamport.value : 0)) await localFirstDB.putMeta({ key: "lamport", value: bundle.lamport });
    return { imported, skipped, conflicts };
  }

  async clearUser(userId: string): Promise<void> { await localFirstDB.clearUser(userId); }
}

export const localFirstStore = new LocalFirstStore();
