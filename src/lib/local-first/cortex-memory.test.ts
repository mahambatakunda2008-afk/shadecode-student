import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/local-first/store", () => ({
  localFirstStore: {
    get: vi.fn(),
    upsert: vi.fn(),
    hydrate: vi.fn(),
    remove: vi.fn(),
  },
}));

import { localFirstStore } from "@/lib/local-first/store";
import { getLocalCortexMemory, saveLocalCortexMemory, hydrateLocalCortexMemory, clearLocalCortexMemory } from "./cortex-memory";

const memory = {
  level: 4, streak: 3, xp: 240, totalTasks: 10, completedTasks: 8,
  subjects: ["Mathematics"], weakTopics: ["Trigonometry"],
} as any;

describe("local Cortex memory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("never returns another user's snapshot", async () => {
    vi.mocked(localFirstStore.get).mockResolvedValue({
      id: "cortex-memory:user-a", entity: "insight", userId: "user-b", payload: memory,
      updatedAt: Date.now(), deviceId: "device", version: 1,
    } as never);
    await expect(getLocalCortexMemory("user-a")).resolves.toBeNull();
  });

  it("persists a normalized snapshot under the authenticated account", async () => {
    vi.mocked(localFirstStore.upsert).mockResolvedValue({} as never);
    await saveLocalCortexMemory("user-a", { ...memory, subjects: ["Mathematics"], examScores: undefined });
    expect(localFirstStore.upsert).toHaveBeenCalledWith(expect.objectContaining({
      id: "cortex-memory:user-a", entity: "insight", userId: "user-a",
    }));
  });

  it("hydrates using server ordering metadata", async () => {
    await hydrateLocalCortexMemory("user-a", memory, 12345);
    expect(localFirstStore.hydrate).toHaveBeenCalledWith(expect.objectContaining({
      id: "cortex-memory:user-a", entity: "insight", userId: "user-a", updatedAt: 12345, deviceId: "server",
    }));
  });

  it("clears only the requested account's snapshot", async () => {
    await clearLocalCortexMemory("user-a");
    expect(localFirstStore.remove).toHaveBeenCalledWith({ id: "cortex-memory:user-a", entity: "insight", userId: "user-a" });
  });
});
