/** Local-first domain primitives. The device is the primary data plane. */
import type { LocalOperation } from "./operations";

export type LocalEntity =
  | "task"
  | "subject"
  | "progress"
  | "xp"
  | "streak"
  | "achievement"
  | "insight"
  | "timetable"
  | "goal"
  | "settings"
  | "study_state"
  | "study_session"
  | "lesson_cache";

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

export type { LocalOperation };

export interface LocalMeta {
  key: string;
  value: string | number | boolean;
}

export interface SyncBundle {
  version: 2;
  exportedAt: number;
  userId: string;
  deviceId: string;
  lamport: number;
  sequence: number;
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