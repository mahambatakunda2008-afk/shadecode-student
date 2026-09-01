import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/offline/dashboardCacheV2", () => ({
  loadDashboardCacheV2: vi.fn(),
  saveDashboardCacheV2: vi.fn(),
}));

import { loadDashboardCacheV2 } from "@/lib/offline/dashboardCacheV2";
import { readDeviceFirstDashboard } from "./deviceFirstDashboard";

describe("readDeviceFirstDashboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("hydrates core and intelligence independently from device storage", async () => {
    vi.mocked(loadDashboardCacheV2).mockImplementation(async (_user, slice) =>
      slice === "core"
        ? { data: { progress: {}, performance: {}, activity: {} } as never, cachedAt: 100 }
        : { data: { recommendations: [] } as never, cachedAt: 200 },
    );

    await expect(readDeviceFirstDashboard("user-1")).resolves.toEqual({
      core: { progress: {}, performance: {}, activity: {} },
      intel: { recommendations: [] },
      coreCachedAt: 100,
      intelCachedAt: 200,
    });
  });

  it("keeps one missing slice from preventing the other slice", async () => {
    vi.mocked(loadDashboardCacheV2).mockImplementation(async (_user, slice) =>
      slice === "core" ? null : { data: { recommendations: [] } as never, cachedAt: 200 },
    );

    const result = await readDeviceFirstDashboard("user-1");
    expect(result.core).toBeNull();
    expect(result.intel).toEqual({ recommendations: [] });
    expect(result.intelCachedAt).toBe(200);
  });
});
