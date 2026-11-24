import { describe, expect, it } from "vitest";
import { isOfflineContentOwnedBy, offlineContentKey } from "../storage";

describe("offline notes and quiz ownership", () => {
  it("allows the account that owns saved content", () => {
    expect(isOfflineContentOwnedBy({ userId: "student-a" }, "student-a")).toBe(true);
  });

  it("denies a different account", () => {
    expect(isOfflineContentOwnedBy({ userId: "student-a" }, "student-b")).toBe(false);
  });

  it("denies anonymous and legacy ownerless records", () => {
    expect(isOfflineContentOwnedBy({ userId: "student-a" }, null)).toBe(false);
    expect(isOfflineContentOwnedBy({}, "student-a")).toBe(false);
    expect(isOfflineContentOwnedBy(null, "student-a")).toBe(false);
  });

  it("uses a distinct IndexedDB key for each account and lesson", () => {
    expect(offlineContentKey("student-a", "lesson-1")).toBe("student-a:lesson-1");
    expect(offlineContentKey("student-b", "lesson-1")).not.toBe(offlineContentKey("student-a", "lesson-1"));
  });
});
