import type { LocalOperation } from "@/lib/local-first/operations";

/** Operations not yet handled by the server-backed /api/sync adapter. */
const SYNCED_BY_MUTATION_QUEUE = new Set(["task", "subject", "progress"]);

export function countLocalOnlyOperations(operations: LocalOperation[]): number {
  return operations.filter((operation) => !operation.syncedAt && !SYNCED_BY_MUTATION_QUEUE.has(operation.entity)).length;
}
