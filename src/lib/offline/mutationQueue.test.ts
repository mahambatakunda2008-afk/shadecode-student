import { describe, expect, it } from "vitest";
import { assertMutationOwner, isMutationReady, retryDelayMs, type OfflineMutation } from "./mutationQueue";

const mutation = (overrides: Partial<OfflineMutation> = {}): OfflineMutation => ({
  id: "m1",
  ownerId: "u1",
  operation: "update",
  store: "tasks",
  payload: { id: "t1", user_id: "u1", completed: true },
  createdAt: new Date(0).toISOString(),
  attempts: 0,
  ...overrides,
});

describe("offline mutation retry policy", () => {
  it("starts immediately and then backs off exponentially", () => {
    expect(retryDelayMs(0)).toBe(0);
    expect(retryDelayMs(1)).toBe(5_000);
    expect(retryDelayMs(2)).toBe(10_000);
    expect(retryDelayMs(3)).toBe(20_000);
    expect(retryDelayMs(8)).toBe(640_000);
    expect(retryDelayMs(9)).toBe(15 * 60_000);
    expect(retryDelayMs(20)).toBe(15 * 60_000);
  });

  it("does not retry before the delay has elapsed", () => {
    const lastAttemptAt = new Date(100_000).toISOString();
    const row = mutation({ attempts: 3, lastAttemptAt });

    expect(isMutationReady(row, 119_999)).toBe(false);
    expect(isMutationReady(row, 120_000)).toBe(true);
  });

  it("stops retrying after the maximum attempt count", () => {
    expect(isMutationReady(mutation({ attempts: 7 }), Date.now())).toBe(true);
    expect(isMutationReady(mutation({ attempts: 8 }), Date.now())).toBe(false);
    expect(isMutationReady(mutation({ attempts: 9 }), Date.now())).toBe(false);
  });

  it("treats an invalid timestamp as immediately retryable", () => {
    expect(isMutationReady(mutation({ attempts: 1, lastAttemptAt: "not-a-date" }), Date.now())).toBe(true);
  });
});


describe("offline mutation ownership", () => {
  it("accepts payloads owned by the queue account or without a redundant owner field", () => {
    expect(() => assertMutationOwner("u1", { id: "task-1", user_id: "u1" })).not.toThrow();
    expect(() => assertMutationOwner("u1", { id: "task-1" })).not.toThrow();
  });

  it("rejects a payload owned by a different account before it can be queued", () => {
    expect(() => assertMutationOwner("u1", { id: "task-1", user_id: "u2" })).toThrow("Offline mutation payload owner does not match its queue owner");
    expect(() => assertMutationOwner("", { id: "task-1" })).toThrow("Offline mutation requires an authenticated owner");
  });
});
