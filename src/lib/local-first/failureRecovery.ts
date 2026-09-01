import { mutationQueue } from "@/lib/offline/mutationQueue";

export interface FailedMutationSummary {
  count: number;
  oldestFailureAt: number | null;
  latestError: string | null;
}

/** Read-only summary for UI. Permanent failures stay failed until explicitly retried. */
export async function getFailedMutationSummary(ownerId: string): Promise<FailedMutationSummary> {
  const failed = await mutationQueue.listFailed(ownerId);
  return {
    count: failed.length,
    oldestFailureAt: failed.length ? Math.min(...failed.map((item) => item.lastAttemptAt ?? Date.now())) : null,
    latestError: failed.length ? (failed[failed.length - 1].lastError ?? null) : null,
  };
}

/** Explicit recovery action. Normal sync must not call this automatically. */
export async function retryFailedMutations(ownerId: string): Promise<number> {
  const failed = await mutationQueue.listFailed(ownerId);
  if (!failed.length) return 0;
  await mutationQueue.resetFailed(ownerId);
  return failed.length;
}
