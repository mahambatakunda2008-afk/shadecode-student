import { beforeEach, describe, expect, it, vi } from "vitest";

const records = new Map<string, any>();

vi.mock("./store", () => ({
  localFirstStore: {
    get: vi.fn(async (id: string) => records.get(id) ?? null),
    upsert: vi.fn(async (input: any) => {
      const value = { id: input.id, entity: input.entity, userId: input.userId, payload: input.payload, updatedAt: Date.now(), deviceId: "test", version: 1 };
      records.set(input.id, value);
      return value;
    }),
  },
}));

import { recordStudyDay } from "./gamification";

describe("local-first streak dates", () => {
  beforeEach(() => records.clear());

  it("does not change the streak at UTC midnight when the device is still on the same local day", async () => {
    const first = new Date(2026, 7, 31, 23, 59, 0);
    const second = new Date(2026, 7, 31, 23, 59, 30);
    await recordStudyDay("user-1", first);
    const result = await recordStudyDay("user-1", second);
    expect(result.payload.current).toBe(1);
    expect(result.payload.lastStudyDate).toBe("2026-08-31");
  });

  it("increments on the next device-local calendar day", async () => {
    await recordStudyDay("user-1", new Date(2026, 7, 31, 23, 59, 0));
    const result = await recordStudyDay("user-1", new Date(2026, 8, 1, 0, 1, 0));
    expect(result.payload.current).toBe(2);
    expect(result.payload.longest).toBe(2);
  });
});
