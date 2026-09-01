import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/local-first/dashboard", () => ({
  loadLocalDashboardSlice: vi.fn(),
  saveLocalDashboardSlice: vi.fn(),
  formatLocalCacheAge: vi.fn((value: number) => `${value}`),
}));

import { loadLocalDashboardSlice, saveLocalDashboardSlice } from "@/lib/local-first/dashboard";
import { loadDashboardCacheV2, saveDashboardCacheV2 } from "./dashboardCacheV2";

describe("dashboardCacheV2", () => {
  it("reads the account-scoped IndexedDB dashboard slice", async () => {
    vi.mocked(loadLocalDashboardSlice).mockResolvedValue({ data: { progress: 42 }, updatedAt: 123 });
    await expect(loadDashboardCacheV2("user-1", "core")).resolves.toEqual({ data: { progress: 42 }, cachedAt: 123 });
    expect(loadLocalDashboardSlice).toHaveBeenCalledWith("user-1", "core");
  });

  it("returns null when no local slice exists", async () => {
    vi.mocked(loadLocalDashboardSlice).mockResolvedValue(null);
    await expect(loadDashboardCacheV2("user-1", "core")).resolves.toBeNull();
  });

  it("writes through to the local-first store", async () => {
    vi.mocked(saveLocalDashboardSlice).mockResolvedValue(undefined);
    await saveDashboardCacheV2("user-1", "intel", { recommendations: [] });
    expect(saveLocalDashboardSlice).toHaveBeenCalledWith("user-1", "intel", { recommendations: [] });
  });
});
