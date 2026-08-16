import { afterEach, describe, expect, it } from "vitest";
import {
  clearOfflineMutations,
  enqueueOfflineMutation,
  listOfflineMutations,
  markMutationFailed,
  markMutationSyncing,
  removeOfflineMutation,
  resetFailedMutations,
} from "../mutationQueue";

function installStorage() {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => data.set(key, value),
        removeItem: (key: string) => data.delete(key),
      },
    },
  });
}

afterEach(() => {
  clearOfflineMutations();
  delete (globalThis as { window?: unknown }).window;
});

describe("offline mutation queue", () => {
  it("persists a mutation with a stable id and pending status", () => {
    installStorage();
    const mutation = enqueueOfflineMutation("task.complete", { taskId: "t1" });
    const stored = listOfflineMutations();

    expect(mutation.id).toBeTruthy();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      id: mutation.id,
      operation: "task.complete",
      payload: { taskId: "t1" },
      attempts: 0,
      status: "pending",
    });
  });

  it("marks a mutation syncing and increments attempts", () => {
    installStorage();
    const mutation = enqueueOfflineMutation("task.complete", { taskId: "t1" });
    markMutationSyncing(mutation.id);

    expect(listOfflineMutations()[0]).toMatchObject({
      status: "syncing",
      attempts: 1,
    });
  });

  it("retains failures and allows them to be reset", () => {
    installStorage();
    const mutation = enqueueOfflineMutation("task.complete", { taskId: "t1" });
    markMutationFailed(mutation.id, new Error("network unavailable"));

    expect(listOfflineMutations()[0]).toMatchObject({
      status: "failed",
      lastError: "network unavailable",
    });

    resetFailedMutations();
    expect(listOfflineMutations()[0]).toMatchObject({
      status: "pending",
    });
    expect(listOfflineMutations()[0].lastError).toBeUndefined();
  });

  it("removes only the completed mutation", () => {
    installStorage();
    const first = enqueueOfflineMutation("task.complete", { taskId: "t1" });
    enqueueOfflineMutation("task.complete", { taskId: "t2" });

    removeOfflineMutation(first.id);

    expect(listOfflineMutations()).toHaveLength(1);
    expect(listOfflineMutations()[0].payload).toEqual({ taskId: "t2" });
  });
});
