import { loadLocalDashboardSlice, saveLocalDashboardSlice, formatLocalCacheAge } from "@/lib/local-first/dashboard";

export interface DashboardCacheResult<T> { data: T; cachedAt: number; }

/** Async-first adapter. Unlike the legacy synchronous API, this actually reads IndexedDB. */
export async function loadDashboardCacheV2<T>(userId: string, slice: string): Promise<DashboardCacheResult<T> | null> {
  const result = await loadLocalDashboardSlice<T>(userId, slice);
  if (!result) return null;
  return { data: result.data, cachedAt: result.updatedAt };
}

export async function saveDashboardCacheV2<T>(userId: string, slice: string, data: T): Promise<void> {
  await saveLocalDashboardSlice(userId, slice, data);
}

export function formatCacheAgeV2(cachedAt: number): string {
  return formatLocalCacheAge(cachedAt);
}
