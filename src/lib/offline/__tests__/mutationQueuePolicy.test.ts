import { describe, expect, it } from "vitest";
import { isMutationReady, retryDelayMs, USER_SCOPED_MUTATION_STORES, type OfflineMutation } from "../mutationQueue";

const base: OfflineMutation = {
  id: "m1",
  ownerId: "user-1",
  operation: "update",
  store: "tasks",
  payload: { id: "task-1", title: "Revise" },
  createdAt: "2026-09-01T10:00:00.000Z",
  attempts: 0,
};

describe("offline mutation policy", () => {
  it("uses bounded exponential retry delays", () => {
    expect(retryDelayMs(0)).toBe(0);
    expect(retryDelayMs(1)).toBe(5_000);
    expect(retryDelayMs(2)).toBe(10_000);
    expect(retryDelayMs(3)).toBe(20_000);
    expect(retryDelayMs(8)).toBe(15 * 60_000);
    expect(retryDelayMs(20)).toBe(15 * 60_000);
  });

  it("keeps a fresh mutation immediately ready", () => {
    expect(isMutationReady(base, Date.parse("2026-09-01T10:00:01.000Z"))).toBe(true);
  });

  it("waits for the retry backoff window", () => {
    const mutation = { ...base, attempts: 2, lastAttemptAt: "2026-09-01T10:00:00.000Z" };
    expect(isMutationReady(mutation, Date.parse("2026-09-01T10:00:09.999Z"))).toBe(false);
    expect(isMutationReady(mutation, Date.parse("2026-09-01T10:00:10.000Z"))).toBe(true);
  });

  it("does not retry permanently failed mutations", () => {
    const mutation = { ...base, attempts: 8, lastAttemptAt: "2026-09-01T10:00:00.000Z" };
    expect(isMutationReady(mutation, Date.parse("2026-09-02T10:00:00.000Z"))).toBe(false);
  });

  it("allows only explicitly approved user-scoped stores", () => {
    expect(USER_SCOPED_MUTATION_STORES.has("tasks")).toBe(true);
    expect(USER_SCOPED_MUTATION_STORES.has("subjects")).toBe(true);
    expect(USER_SCOPED_MUTATION_STORES.has("learn_lessons")).toBe(true);
    expect(USER_SCOPED_MUTATION_STORES.has("learning_events")).toBe(true);
    expect(USER_SCOPED_MUTATION_STORES.has("auth.users")).toBe(false);
    expect(USER_SCOPED_MUTATION_STORES.has("storage.objects")).toBe(false);
  });
});
