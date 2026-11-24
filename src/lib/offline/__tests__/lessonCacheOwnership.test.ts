import { describe, expect, it } from "vitest";
import { isOfflineLessonOwnedBy, offlineLessonKey } from "../storage";

describe("offline lesson cache ownership", () => {
  it("uses separate IndexedDB keys for the same lesson across accounts", () => {
    expect(offlineLessonKey("student-a", "lesson-1")).toBe("student-a:lesson-1");
    expect(offlineLessonKey("student-b", "lesson-1")).toBe("student-b:lesson-1");
    expect(offlineLessonKey("student-a", "lesson-1")).not.toBe(offlineLessonKey("student-b", "lesson-1"));
  });

  it("allows the account that owns a cached lesson", () => {
    expect(isOfflineLessonOwnedBy({ ownerUserId: "student-a" }, "student-a")).toBe(true);
  });

  it("denies a different account", () => {
    expect(isOfflineLessonOwnedBy({ ownerUserId: "student-a" }, "student-b")).toBe(false);
  });

  it("denies anonymous access", () => {
    expect(isOfflineLessonOwnedBy({ ownerUserId: "student-a" }, null)).toBe(false);
  });

  it("denies legacy ownerless cache entries", () => {
    expect(isOfflineLessonOwnedBy({ ownerUserId: undefined as unknown as string }, "student-a")).toBe(false);
    expect(isOfflineLessonOwnedBy(undefined, "student-a")).toBe(false);
  });
});
