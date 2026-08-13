/**
 * Local-first domain primitives.
 *
 * The device is the primary data plane. Remote services are optional relays,
 * backups, and coordination points rather than the source of truth.
 */

export type LocalEntity =
  | "task"
  | "progress"
  | "xp"
  | "streak"
  | "achievement"
  | "insight"
  | "timetable"
  | "goal"
  | "settings"
  | "study_state";

export interface LocalRecord<T = unknown> {
  id: string;
  entity: LocalEntity;
  userId: string;
  payload: T;
  updatedAt: number;
  deviceId: string;
  version: number;
  deletedAt?: number;
}

export interface LocalOperation {
  id: string;
  recordId: string;
  entity: LocalEntity;
  userId: string;
  deviceId: string;
  lamport: number;
  timestamp: number;
  type: "upsert" | "delete";
  payload?: unknown;
}

export interface LocalMeta {
  key: string;
  value: string | number | boolean;
}

export interface SyncBundle {
  version: 1;
  exportedAt: number;
  userId: string;
  deviceId: string;
  lamport: number;
  records: LocalRecord[];
  operations: LocalOperation[];
}

export interface EncryptedSyncBundle {
  version: 1;
  algorithm: "AES-GCM";
  kdf: "PBKDF2-SHA-256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
  createdAt: number;
}

export interface SyncResult {
  imported: number;
  skipped: number;
  conflicts: number;
}
