import { describe, expect, it } from "vitest";
import { focusSessionRecordId, focusStatsRecordId, isFocusRecordOwnedBy } from "./focus";

describe("offline focus record ownership", () => {
  it("separates sessions and daily stats by account", () => {
    expect(focusSessionRecordId("a")).not.toBe(focusSessionRecordId("b"));
    expect(focusStatsRecordId("a", "2026-11-25")).not.toBe(focusStatsRecordId("b", "2026-11-25"));
  });
  it("rejects records belonging to another account", () => {
    expect(isFocusRecordOwnedBy({ userId: "a" }, "a")).toBe(true);
    expect(isFocusRecordOwnedBy({ userId: "a" }, "b")).toBe(false);
    expect(isFocusRecordOwnedBy(null, "a")).toBe(false);
  });
});
