import { localFirstDB } from "./db";
import type {
  LocalEntity,
  LocalOperation,
  LocalRecord,
  SyncBundle,
  SyncResult,
} from "./types";

const DEVICE_KEY = "deviceId";
const LAMPORT_KEY = "lamport";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function getDeviceId(): Promise<string> {
  const existing = await localFirstDB.getMeta(DEVICE_KEY);
  if (typeof existing?.value === "string") return existing.value;

  const deviceId = createId();
  await localFirstDB.putMeta({ key: DEVICE_KEY, value: deviceId });
  return deviceId;
}

async function nextLamport(remoteLamport = 0): Promise<number> {
  const existing = await localFirstDB.getMeta(LAMPORT_KEY);
  const current = typeof existing?.value === "number" ? existing.value : 0;
  const next = Math.max(current, remoteLamport) + 1;
  await localFirstDB.putMeta({ key: LAMPORT_KEY, value: next });
  return next;
}

function compareRecords(a: LocalRecord, b: LocalRecord): number {
  if (a.version !== b.version) return a.version - b.version;
  if (a.updatedAt !== b.updatedAt) return a.updatedAt - b.updatedAt;
  return a.deviceId.localeCompare(b.deviceId);
}

export class LocalFirstStore {
  async deviceId(): Promise<string> {
    return getDeviceId();
  }

  async get<T>(id: string): Promise<LocalRecord<T> | null> {
    return localFirstDB.getRecord<T>(id);
  }

  async list(userId: string): Promise<LocalRecord[]> {
    return localFirstDB.getRecords(userId);
  }

  async upsert<T>(input: {
    id?: string;
    entity: LocalEntity;
    userId: string;
    payload: T;
  }): Promise<LocalRecord<T>> {
    const deviceId = await getDeviceId();
    const id = input.id ?? createId();
    const existing = await localFirstDB.getRecord<T>(id);
    const lamport = await nextLamport(existing?.version ?? 0);
    const record: LocalRecord<T> = {
      id,
      entity: input.entity,
      userId: input.userId,
      payload: input.payload,
      updatedAt: Date.now(),
      deviceId,
      version: lamport,
    };

    await localFirstDB.putRecord(record);
    await localFirstDB.putOperation({
      id: createId(),
      recordId: id,
      entity: input.entity,
      userId: input.userId,
      deviceId,
      lamport,
      timestamp: record.updatedAt,
      type: "upsert",
      payload: input.payload,
    });

    return record;
  }

  async remove(input: {
    id: string;
    entity: LocalEntity;
    userId: string;
  }): Promise<void> {
    const deviceId = await getDeviceId();
    const existing = await localFirstDB.getRecord(input.id);
    const lamport = await nextLamport(existing?.version ?? 0);
    const now = Date.now();
    const tombstone: LocalRecord = {
      id: input.id,
      entity: input.entity,
      userId: input.userId,
      payload: null,
      updatedAt: now,
      deviceId,
      version: lamport,
      deletedAt: now,
    };

    await localFirstDB.putRecord(tombstone);
    await localFirstDB.putOperation({
      id: createId(),
      recordId: input.id,
      entity: input.entity,
      userId: input.userId,
      deviceId,
      lamport,
      timestamp: now,
      type: "delete",
    });
  }

  async exportBundle(userId: string): Promise<SyncBundle> {
    const [records, operations] = await Promise.all([
      localFirstDB.getRecords(userId),
      localFirstDB.getOperations(userId),
    ]);
    const deviceId = await getDeviceId();
    const meta = await localFirstDB.getMeta(LAMPORT_KEY);

    return {
      version: 1,
      exportedAt: Date.now(),
      userId,
      deviceId,
      lamport: typeof meta?.value === "number" ? meta.value : 0,
      records,
      operations,
    };
  }

  async importBundle(bundle: SyncBundle, expectedUserId?: string): Promise<SyncResult> {
    if (bundle.version !== 1) throw new Error("Unsupported Shadecode sync bundle version");
    if (expectedUserId && bundle.userId !== expectedUserId) {
      throw new Error("This sync bundle belongs to a different account");
    }

    let imported = 0;
    let skipped = 0;
    let conflicts = 0;

    for (const remote of bundle.records) {
      const local = await localFirstDB.getRecord(remote.id);
      if (!local) {
        await localFirstDB.putRecord(remote);
        imported += 1;
        continue;
      }

      const comparison = compareRecords(remote, local);
      if (comparison > 0) {
        await localFirstDB.putRecord(remote);
        imported += 1;
        if (local.deviceId !== remote.deviceId) conflicts += 1;
      } else {
        skipped += 1;
      }
    }

    const localOperations = await localFirstDB.getOperations(bundle.userId);
    const knownOperationIds = new Set(localOperations.map((operation) => operation.id));
    for (const operation of bundle.operations) {
      if (knownOperationIds.has(operation.id)) continue;
      await localFirstDB.putOperation(operation);
    }

    await nextLamport(bundle.lamport);
    return { imported, skipped, conflicts };
  }

  async clearUser(userId: string): Promise<void> {
    await localFirstDB.clearUser(userId);
  }
}

export const localFirstStore = new LocalFirstStore();
