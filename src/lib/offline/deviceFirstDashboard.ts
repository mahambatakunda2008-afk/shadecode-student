import { loadDashboardCacheV2, saveDashboardCacheV2 } from "@/lib/offline/dashboardCacheV2";
import type { StudentProgress, StudentPerformance, StudentActivity, StudentIntelligenceData } from "@/lib/student-intelligence";

export type DashboardCoreSnapshot = {
  progress: StudentProgress;
  performance: StudentPerformance;
  activity: StudentActivity;
};

export type DeviceFirstDashboardSnapshot = {
  core: DashboardCoreSnapshot | null;
  intel: StudentIntelligenceData | null;
  coreCachedAt: number | null;
  intelCachedAt: number | null;
};

/**
 * Reads both Dashboard slices from the device in parallel. This is intentionally
 * independent of Supabase/Cortex so the UI can hydrate before the network.
 */
export async function readDeviceFirstDashboard(userId: string): Promise<DeviceFirstDashboardSnapshot> {
  const [core, intel] = await Promise.all([
    loadDashboardCacheV2<DashboardCoreSnapshot>(userId, "core"),
    loadDashboardCacheV2<StudentIntelligenceData>(userId, "intel"),
  ]);

  return {
    core: core?.data ?? null,
    intel: intel?.data ?? null,
    coreCachedAt: core?.cachedAt ?? null,
    intelCachedAt: intel?.cachedAt ?? null,
  };
}

/** Persist a successful remote refresh without making persistence a render dependency. */
export function persistDashboardRefresh(userId: string, snapshot: DeviceFirstDashboardSnapshot): void {
  if (snapshot.core) void saveDashboardCacheV2(userId, "core", snapshot.core);
  if (snapshot.intel) void saveDashboardCacheV2(userId, "intel", snapshot.intel);
}
