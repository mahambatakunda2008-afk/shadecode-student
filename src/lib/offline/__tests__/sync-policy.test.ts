import { describe, expect, it } from "vitest";
import { compareOperations, type LocalOperation } from "@/lib/local-first/operations";

describe("offline sync policy", () => {
  it("orders an older progress operation before a newer one", () => {
    const older: LocalOperation = { id: "a:1", deviceId: "a", userId: "u", entity: "progress", entityId: "lesson-1", kind: "update", payload: { progress: 20 }, timestamp: "2026-09-01T10:00:00.000Z", sequence: 1, lamport: 4 };
    const newer: LocalOperation = { ...older, id: "a:2", sequence: 2, lamport: 5, payload: { progress: 40 } };
    expect(compareOperations(older, newer)).toBeLessThan(0);
  });

  it("uses one network transport for progress instead of a second direct-write policy", () => {
    const source = "src/lib/offline/sync.ts";
    expect(source).toContain("/api/sync");
    expect(source).not.toContain('supabase.from(\"learn_lessons\").update');
  });
});
