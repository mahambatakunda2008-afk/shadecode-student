import { describe, expect, it, vi } from "vitest";

vi.mock("./store", () => ({
  localFirstStore: {
    get: vi.fn(),
    list: vi.fn(),
    upsert: vi.fn(),
  },
}));

import { localFirstStore } from "./store";
import { getLocalLearningEvent, recordLearningEventLocally } from "./learning-events";

describe("local learning event ledger", () => {
  it("deduplicates an event by canonical event id", async () => {
    const existing = { id: "learning-event:e1", entity: "learning_event", userId: "u1", payload: { eventId: "e1", userId: "u1" }, updatedAt: 1, deviceId: "d1", version: 1 };
    vi.mocked(localFirstStore.get).mockResolvedValue(existing as never);
    await expect(recordLearningEventLocally("u1", existing.payload as never)).resolves.toBe(existing);
    expect(localFirstStore.upsert).not.toHaveBeenCalled();
  });

  it("refuses an event owned by another account", async () => {
    vi.mocked(localFirstStore.get).mockResolvedValue({ userId: "u2" } as never);
    await expect(recordLearningEventLocally("u1", { eventId: "e1", userId: "u1", sourceEventId: "s1" } as never)).rejects.toThrow("cross-account");
  });

  it("returns only the requested user's event", async () => {
    vi.mocked(localFirstStore.get).mockResolvedValue({ userId: "u1", deletedAt: undefined, payload: { eventId: "e1" } } as never);
    await expect(getLocalLearningEvent("u1", "e1")).resolves.toEqual({ eventId: "e1" });
    await expect(getLocalLearningEvent("u2", "e1")).resolves.toBeNull();
  });
});
