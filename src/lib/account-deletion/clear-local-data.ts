import { localFirstStore } from "@/lib/local-first/store";
import { mutationQueue } from "@/lib/offline/mutationQueue";
import { offlineStorage } from "@/lib/offline/storage";

/**
 * Erases account-owned browser data after the server has confirmed deletion.
 * Callers must never invoke this on request acceptance or a transient auth/network error.
 * Shared offline curriculum content is intentionally retained.
 */
export async function clearDeletedAccountLocalData(userId: string): Promise<void> {
  if (!userId) throw new Error("A user ID is required for local account cleanup");

  // Stop any queued writes before removing the data they refer to.
  await mutationQueue.clearOwner(userId);
  await localFirstStore.clearUser(userId);
  await offlineStorage.clearUserRecords(userId);
}
