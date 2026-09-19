import { describe, expect, it } from "vitest";
import { classifyFailure, storeLabel, summarizeFailedMutations } from "../failureSummary";

describe("classifyFailure", () => {
  it.each([
    // Messages the real client/server actually produce (see sync.ts + /api/sync).
    ["Authentication required", "signed-out"],
    ["Sync failed (401)", "signed-out"],
    ["Queued mutation user_id does not match authenticated user", "wrong-account"],
    ["Record ownership does not match authenticated user", "wrong-account"],
    ["Payload owner does not match authenticated user", "wrong-account"],
    ["Sync failed (403)", "wrong-account"],
    ["Failed to fetch", "network"],
    ["NetworkError when attempting to fetch resource.", "network"],
    ["Load failed", "network"],
    ["Sync failed (409)", "conflict"],
    ["Sync failed", "server"],
    ["Sync failed (500)", "server"],
    ["Sync failed (503)", "server"],
    ["Sync endpoint returned an unknown result", "unknown"],
    ["Store is not syncable", "unknown"],
    ["", "unknown"],
    [undefined, "unknown"],
    [null, "unknown"],
  ] as const)("classifies %j as %s", (input, expected) => {
    expect(classifyFailure(input)).toBe(expected);
  });

  it("checks account mismatch before sign-in so 'authenticated user' is not misread", () => {
    // Contains the word "authenticated" but is a permanent wrong-account failure.
    expect(classifyFailure("payload does not match authenticated user")).toBe("wrong-account");
  });
});

describe("storeLabel", () => {
  it("labels known stores and falls back for unknown ones", () => {
    expect(storeLabel("tasks")).toBe("Task");
    expect(storeLabel("learn_lessons")).toBe("Lesson progress");
    expect(storeLabel("something_new")).toBe("Change");
  });
});

describe("summarizeFailedMutations", () => {
  it("returns an empty list when nothing failed", () => {
    expect(summarizeFailedMutations([])).toEqual([]);
  });

  it("groups by store and reason and counts them", () => {
    const result = summarizeFailedMutations([
      { store: "tasks", lastError: "Failed to fetch" },
      { store: "tasks", lastError: "Load failed" },
      { store: "tasks", lastError: "Sync failed (500)" },
      { store: "learn_lessons", lastError: "Failed to fetch" },
    ]);
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ key: "tasks:network", label: "Task", count: 2, reason: "network" });
    expect(result.map((r) => r.key)).toEqual(["tasks:network", "learn_lessons:network", "tasks:server"]);
  });

  it("orders ties deterministically", () => {
    const a = summarizeFailedMutations([
      { store: "subjects", lastError: "Sync failed" },
      { store: "tasks", lastError: "Sync failed" },
    ]);
    const b = summarizeFailedMutations([
      { store: "tasks", lastError: "Sync failed" },
      { store: "subjects", lastError: "Sync failed" },
    ]);
    expect(a.map((r) => r.key)).toEqual(b.map((r) => r.key));
  });

  it("never surfaces raw error text to the user", () => {
    const secret = 'duplicate key value violates unique constraint "sync_revisions_pkey"';
    const [item] = summarizeFailedMutations([{ store: "tasks", lastError: secret }]);
    expect(JSON.stringify(item)).not.toContain("sync_revisions_pkey");
    expect(item.message.length).toBeGreaterThan(0);
  });

  it("gives every reason an actionable message", () => {
    const reasons = ["Authentication required", "does not match", "Failed to fetch", "Sync failed (409)", "Sync failed", "???"];
    for (const lastError of reasons) {
      const [item] = summarizeFailedMutations([{ store: "tasks", lastError }]);
      expect(item.message).toBeTruthy();
    }
  });
});
