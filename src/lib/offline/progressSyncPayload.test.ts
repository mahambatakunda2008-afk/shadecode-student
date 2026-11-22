import { describe, expect, it } from "vitest";
import { buildProgressSyncPayload } from "./progressSyncPayload";

describe("progress-only sync payload", () => {
  it("sends only the lesson progress fields and explicit mutation kind", () => {
    expect(buildProgressSyncPayload({ lessonId: "lesson-1", progress: 65, completed: false }, "lesson-1", "user-1"))
      .toEqual({ sync_kind: "progress", progress: 65, id: "lesson-1", user_id: "user-1" });
  });

  it("accepts completed progress at 100 percent", () => {
    expect(buildProgressSyncPayload({ progress: 100 }, "lesson-1", "user-1").progress).toBe(100);
  });

  it("rejects invalid progress values", () => {
    for (const progress of [-1, 101, 1.5, "65", null]) {
      expect(() => buildProgressSyncPayload({ progress }, "lesson-1", "user-1")).toThrow();
    }
  });

  it("requires an authenticated owner and lesson identity", () => {
    expect(() => buildProgressSyncPayload({ progress: 50 }, "", "user-1")).toThrow();
    expect(() => buildProgressSyncPayload({ progress: 50 }, "lesson-1", "")).toThrow();
  });
});
