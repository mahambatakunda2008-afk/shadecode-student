import { beforeEach, describe, expect, it, vi } from "vitest";

const syncAll = vi.fn<() => Promise<void>>();
const markProgressSynced = vi.fn();
const getUnsyncedProgress = vi.fn();
const offlineSyncFailed = vi.fn();

vi.mock("../sync", () => ({ offlineSync: { syncAll: () => syncAll() } }));
vi.mock("../storage", () => ({
  offlineStorage: { markProgressSynced, getUnsyncedProgress },
}));
vi.mock("@/lib/observability", () => ({ log: { offlineSyncFailed } }));

const fetchMock = vi.fn();

describe("downloadManager.syncProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    syncAll.mockResolvedValue(undefined);
  });

  it("delegates to the canonical offlineSync path exactly once", async () => {
    const { downloadManager } = await import("../downloadManager");
    await downloadManager.syncProgress("user-1");
    expect(syncAll).toHaveBeenCalledTimes(1);
  });

  it("never posts to a progress endpoint or acknowledges operations itself", async () => {
    const { downloadManager } = await import("../downloadManager");
    await downloadManager.syncProgress("user-1");
    // Regression: previously POSTed to a non-existent /api/learn/progress (404),
    // ignored the status, then marked local progress as synced -> silent data loss.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(markProgressSynced).not.toHaveBeenCalled();
    expect(getUnsyncedProgress).not.toHaveBeenCalled();
  });

  it("reports a failed sync via observability without throwing or acknowledging", async () => {
    syncAll.mockRejectedValueOnce(new Error("boom"));
    const { downloadManager } = await import("../downloadManager");
    await expect(downloadManager.syncProgress("user-1")).resolves.toBeUndefined();
    expect(offlineSyncFailed).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", operation: "syncProgress", error: "boom" }),
    );
    expect(markProgressSynced).not.toHaveBeenCalled();
  });
});
