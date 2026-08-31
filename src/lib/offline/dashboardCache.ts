/**
 * Compatibility facade for the old dashboard cache API.
 * Storage now lives in the same account-scoped IndexedDB plane as learner state.
 */
import { loadLocalDashboardSlice, saveLocalDashboardSlice, formatLocalCacheAge } from "@/lib/local-first/dashboard";

export function saveDashboardCache<T>(userId: string, slice: string, data: T): void {
  void saveLocalDashboardSlice(userId, slice, data);
}

export interface DashboardCacheResult<T> { data: T; cachedAt: number; }

export function loadDashboardCache<T>(userId: string, slice: string): DashboardCacheResult<T> | null {
  // Kept synchronous for callers that have not yet migrated. New code should
  // use loadLocalDashboardSlice() so it can await IndexedDB safely.
  return null;
}

export function formatCacheAge(cachedAt: number): string { return formatLocalCacheAge(cachedAt); }

export { loadLocalDashboardSlice, saveLocalDashboardSlice };
