import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/offline/mutationQueue", () => ({
  mutationQueue: {
    listFailed: vi.fn(),
    resetFailed: vi.fn(),
  },
}));

import { mutationQueue } from "@/lib/offline/mutationQueue";
import { getFailedMutationSummary, retryFailedMutations } from "./failureRecovery";

describe("failure recovery", () => {
  it("summarizes failures without changing queue state", async () => {
    vi.mocked(mutationQueue.listFailed).mockResolvedValue([
      { id: "a", lastAttemptAt: 20, lastError: "timeout" },
      { id: "b", lastAttemptAt: 40, lastError: "conflict" },
    ] as never);
    await expect(getFailedMutationSummary("user-1")).resolves.toEqual({ count: 2, oldestFailureAt: 20, latestError: "conflict" });
    expect(mutationQueue.resetFailed).not.toHaveBeenCalled();
  });

  it("only resets failures through an explicit recovery action", async () => {
    vi.mocked(mutationQueue.listFailed).mockResolvedValue([{ id: "a" }] as never);
    vi.mocked(mutationQueue.resetFailed).mockResolvedValue(undefined);
    await expect(retryFailedMutations("user-1")).resolves.toBe(1);
    expect(mutationQueue.resetFailed).toHaveBeenCalledWith("user-1");
  });
});
