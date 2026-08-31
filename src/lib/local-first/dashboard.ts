import { localFirstDB } from "./db";
import type { DashboardSlice } from "./types";

const idFor = (userId: string, slice: string) => `dashboard:${userId}:${slice}`;

/** Dashboard aggregates are cached in the same IndexedDB plane as learner state. */
export async function saveLocalDashboardSlice<T>(userId: string, slice: string, data: T): Promise<void> {
  if (!userId) throw new Error("Dashboard cache requires an authenticated user");
  await localFirstDB.putRecord({
    id: idFor(userId, slice),
    entity: "dashboard_slice",
    userId,
    payload: { data, cachedAt: Date.now() } satisfies DashboardSlice<T>,
    updatedAt: Date.now(),
    deviceId: await localFirstDB.getOrCreateDeviceId(() => crypto.randomUUID()),
    version: Date.now(),
  });
}

export async function loadLocalDashboardSlice<T>(userId: string, slice: string): Promise<DashboardSlice<T> | null> {
  if (!userId) return null;
  const record = await localFirstDB.getRecord<{ data: T; cachedAt: number }>(idFor(userId, slice));
  if (!record || record.userId !== userId || record.deletedAt) return null;
  return { data: record.payload.data, cachedAt: record.payload.cachedAt, source: "local" };
}

export function formatLocalCacheAge(cachedAt: number): string {
  const minutes = Math.max(0, Math.floor((Date.now() - cachedAt) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
