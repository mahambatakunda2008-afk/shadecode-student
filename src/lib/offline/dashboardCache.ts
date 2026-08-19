/**
 * src/lib/offline/dashboardCache.ts
 *
 * Read-through cache for the dashboard's computed data (StudentProgress,
 * StudentPerformance, StudentActivity, StudentIntelligenceData). These
 * aren't simple table rows the way tasks/subjects are -- they're derived
 * aggregates computed server-side from multiple underlying tables -- so
 * the existing offlineSync/mutationQueue machinery (built for durable,
 * conflict-resolved writes to user-editable records) isn't the right fit.
 * This is pure read caching: save the last successful response, serve it
 * back when a fresh fetch fails or the device is offline. No writes, no
 * sync, no conflict resolution needed.
 *
 * Uses localStorage rather than the IndexedDB local-first layer other
 * parts of the app are actively building out -- dashboard payloads are a
 * few KB of JSON, a synchronous read on mount is simpler and avoids any
 * coordination with that separate, more complex system.
 */

const CACHE_VERSION = 1;
const PREFIX = "shadecode:dashboard-cache:v" + CACHE_VERSION + ":";

interface CacheEnvelope<T> {
  data: T;
  cachedAt: number;
}

function keyFor(userId: string, slice: string): string {
  return `${PREFIX}${userId}:${slice}`;
}

export function saveDashboardCache<T>(userId: string, slice: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    const envelope: CacheEnvelope<T> = { data, cachedAt: Date.now() };
    window.localStorage.setItem(keyFor(userId, slice), JSON.stringify(envelope));
  } catch {
    // Storage full, disabled, or private-browsing -- caching is a nice-to-have,
    // never let it break the actual data flow.
  }
}

export interface DashboardCacheResult<T> {
  data: T;
  cachedAt: number;
}

export function loadDashboardCache<T>(userId: string, slice: string): DashboardCacheResult<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(keyFor(userId, slice));
    if (!raw) return null;
    const envelope = JSON.parse(raw) as CacheEnvelope<T>;
    if (!envelope || typeof envelope.cachedAt !== "number") return null;
    return { data: envelope.data, cachedAt: envelope.cachedAt };
  } catch {
    return null;
  }
}

/** Human-readable "cached 4 minutes ago" style string for UI display. */
export function formatCacheAge(cachedAt: number): string {
  const minutes = Math.floor((Date.now() - cachedAt) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
