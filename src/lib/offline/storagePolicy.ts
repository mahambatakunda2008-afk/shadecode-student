export type LocalMutation = {
  id: string;
  entity: string;
  operation: "create" | "update" | "delete";
  payload: unknown;
  createdAt: number;
};

export type SyncDecision = "keep-local" | "queue-sync" | "sync-now";

/** Local state is authoritative while offline. Cloud sync is eventual, never blocking. */
export function decideSync(online: boolean, mutation: LocalMutation): SyncDecision {
  if (!online) return "keep-local";
  return mutation.createdAt > 0 ? "sync-now" : "queue-sync";
}

export function shouldUploadPrivateEvidence(explicitCloudPermission: boolean): boolean {
  return explicitCloudPermission;
}
