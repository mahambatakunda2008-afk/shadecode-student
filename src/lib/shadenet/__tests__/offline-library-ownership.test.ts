import { describe, expect, it } from "vitest";
import { isOfflineResourceOwnedBy } from "../offline-library";

describe("offline resource account ownership", () => {
  it("only exposes records to their owning account", () => {
    expect(isOfflineResourceOwnedBy({ ownerId: "learner-a" }, "learner-a")).toBe(true);
    expect(isOfflineResourceOwnedBy({ ownerId: "learner-a" }, "learner-b")).toBe(false);
  });

  it("never assigns legacy ownerless records to a signed-in account", () => {
    expect(isOfflineResourceOwnedBy({ ownerId: "" }, "learner-a")).toBe(false);
    expect(isOfflineResourceOwnedBy({ ownerId: "undefined" }, "learner-a")).toBe(false);
  });

  it("rejects an empty account identity", () => {
    expect(isOfflineResourceOwnedBy({ ownerId: "" }, "")).toBe(false);
    expect(isOfflineResourceOwnedBy({ ownerId: "learner-a" }, " ")).toBe(false);
  });
});
