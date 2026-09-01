/**
 * Compatibility facade for the old dashboard cache API.
 * Durable storage lives in account-scoped IndexedDB; a tiny synchronous mirror
 * exists only for legacy callers that cannot await IndexedDB yet.
 */
import { loadLocalDashboardSlice, saveLocalDashboardSlice, formatLocalCacheAge } from "@/lib/local-first/dashboard";

const MIRROR_PREFIX = "shadecode:dashboard-mirror:v1:";
const mirrorKey = (userId: string, slice: string) => `${MIRROR_PREFIX}${encodeURIComponent(userId)}:${encodeURIComponent(slice)}`;
interface Mirror<T> { userId: string; data: T; cachedAt: number; }

export function saveDashboardCache<T>(userId: string, slice: string, data: T): void {
  if (!userId) return;
  const cachedAt = Date.now();
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(mirrorKey(userId, slice), JSON.stringify({ userId, data, cachedAt } satisfies Mirror<T>));
  } catch { /* IndexedDB remains the durable store. */ }
  void saveLocalDashboardSlice(userId, slice, data);
}

export interface DashboardCacheResult<T> { data: T; cachedAt: number; }

export function loadDashboardCache<T>(userId: string, slice: string): DashboardCacheResult<T> | null {
  if (!userId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(mirrorKey(userId, slice));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Mirror<T>;
    if (!parsed || parsed.userId !== userId || typeof parsed.cachedAt !== "number") return null;
    return { data: parsed.data, cachedAt: parsed.cachedAt };
  } catch { return null; }
}

export function clearDashboardCache(userId: string, slice?: string): void {
  if (!userId || typeof window === "undefined") return;
  try {
    if (slice) window.localStorage.removeItem(mirrorKey(userId, slice));
    else for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(`${MIRROR_PREFIX}${encodeURIComponent(userId)}:`)) window.localStorage.removeItem(key);
    }
  } catch { /* best effort */ }
}

export function formatCacheAge(cachedAt: number): string { return formatLocalCacheAge(cachedAt); }
export { loadLocalDashboardSlice, saveLocalDashboardSlice };
