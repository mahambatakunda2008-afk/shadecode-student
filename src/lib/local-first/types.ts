/** Local-first domain primitives. The device is the primary data plane. */
import type { LocalOperation } from "./operations";

export type LocalEntity =
  | "task" | "subject" | "progress" | "xp" | "streak" | "achievement" | "insight"
  | "timetable" | "goal" | "settings" | "study_state" | "study_session" | "lesson_cache"
  | "exam_attempt" | "exam_result" | "exam_submission" | "education_profile";

export interface LocalRecord<T = unknown> {
  id: string;
  entity: LocalEntity;
  userId: string;
  payload: T;
  updatedAt: number;
  deviceId: string;
  version: number;
  /** Last server-side revision observed for this record. */
  syncVersion?: number;
  deletedAt?: number;
}

export type { LocalOperation };
export interface LocalMeta { key: string; value: string | number | boolean; }
export interface SyncBundle { version: 2; exportedAt: number; userId: string; deviceId: string; lamport: number; sequence: number; records: LocalRecord[]; operations: LocalOperation[]; }
export interface EncryptedSyncBundle { version: 1; algorithm: "AES-GCM"; kdf: "PBKDF2-SHA-256"; iterations: number; salt: string; iv: string; ciphertext: string; createdAt: number; }
export interface SyncResult { imported: number; skipped: number; conflicts: number; }
export interface LocalConflict<T = unknown> { id: string; userId: string; entity: LocalEntity; entityId: string; winner: LocalOperation<T>; loser: LocalOperation<T>; reason: "causal-order" | "deterministic-tie-break"; createdAt: number; resolvedAt?: number; }
