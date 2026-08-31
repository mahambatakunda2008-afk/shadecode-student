import type { OfflineMutation } from "./mutationQueue";

export type ConflictPolicy =
  | "record_version"
  | "field_merge"
  | "append_only"
  | "server_validated"
  | "idempotent_event";

export interface MutationEnvelope<T = unknown> {
  mutationId: string;
  ownerId: string;
  deviceId: string;
  entity: string;
  entityId: string;
  operation: OfflineMutation["operation"];
  baseVersion?: number;
  clientVersion: number;
  createdAt: string;
  payload: T;
}

export interface ConflictResolution<T = unknown> {
  status: "applied" | "duplicate" | "conflict" | "rejected";
  policy: ConflictPolicy;
  payload?: T;
  serverVersion?: number;
  message?: string;
}

const POLICIES: Record<string, ConflictPolicy> = {
  tasks: "field_merge",
  subjects: "record_version",
  learn_lessons: "record_version",
  projects: "record_version",
  project_evidence: "append_only",
  project_milestones: "record_version",
  progress: "record_version",
  xp: "server_validated",
  streak: "server_validated",
  achievements: "idempotent_event",
};

export function conflictPolicyForStore(store: string): ConflictPolicy {
  return POLICIES[store] ?? "record_version";
}

export function mutationEntityId(mutation: OfflineMutation): string | null {
  const payload = mutation.payload;
  if (!payload || typeof payload !== "object") return null;
  const value = payload as Record<string, unknown>;
  const id = value.id ?? value.entityId ?? value.projectId ?? value.project_id;
  return typeof id === "string" && id ? id : null;
}

export function toMutationEnvelope<T>(mutation: OfflineMutation<T>, deviceId: string, clientVersion: number, baseVersion?: number): MutationEnvelope<T> {
  const entityId = mutationEntityId(mutation);
  if (!entityId) throw new Error("Offline mutation requires an entity ID");
  return {
    mutationId: mutation.id,
    ownerId: mutation.ownerId,
    deviceId,
    entity: mutation.store,
    entityId,
    operation: mutation.operation,
    baseVersion,
    clientVersion,
    createdAt: mutation.createdAt,
    payload: mutation.payload,
  };
}

export function mergeTaskFields<T extends Record<string, unknown>>(server: T, client: T): T {
  const merged = { ...server };
  for (const key of ["subject_id", "title", "completed"] as const) {
    if (client[key] !== undefined) merged[key] = client[key];
  }
  return merged;
}

export function resolveRecordConflict<T extends Record<string, unknown>>(
  server: { payload: T; version: number },
  client: { payload: T; version: number },
  policy: ConflictPolicy,
): ConflictResolution<T> {
  if (policy === "field_merge") return { status: "applied", policy, payload: mergeTaskFields(server.payload, client.payload), serverVersion: Math.max(server.version, client.version) };
  if (policy === "append_only" || policy === "idempotent_event" || policy === "server_validated") return { status: "conflict", policy, serverVersion: server.version, message: "This entity requires server-side reconciliation." };
  if (client.version >= server.version) return { status: "applied", policy, payload: client.payload, serverVersion: client.version };
  return { status: "conflict", policy, payload: server.payload, serverVersion: server.version, message: "The server has a newer revision." };
}
