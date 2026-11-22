import { describe, expect, it } from "vitest";
import { isOfflineLessonOwnedBy } from "../storage";

describe("offline lesson cache ownership", () => {
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
