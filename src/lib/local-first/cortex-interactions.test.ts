import { describe, expect, it, vi } from "vitest";

vi.mock("./store", () => ({ localFirstStore: { list: vi.fn(), upsert: vi.fn(), remove: vi.fn() } }));
import { localFirstStore } from "./store";
import { saveLocalCortexInteraction, listLocalCortexInteractions } from "./cortex-interactions";

describe("local Cortex interactions", () => {
  it("rejects cross-account writes", async () => {
    await expect(saveLocalCortexInteraction("a", { userId: "b", question: "q", answer: "a", timestamp: new Date().toISOString() })).rejects.toThrow();
  });
  it("returns only the requested user's interaction records", async () => {
    vi.mocked(localFirstStore.list).mockResolvedValue([
      { id: "cortex-interaction:user-a:x", payload: { userId: "user-a", question: "one", answer: "1", timestamp: "2026-01-01T00:00:00.000Z" } },
      { id: "cortex-interaction:user-b:y", payload: { userId: "user-b", question: "two", answer: "2", timestamp: "2026-01-02T00:00:00.000Z" } },
    ] as never);
    const result = await listLocalCortexInteractions("user-a");
    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe("user-a");
  });
});
