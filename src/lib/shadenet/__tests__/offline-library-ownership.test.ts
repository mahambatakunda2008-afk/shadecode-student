import { describe, expect, it } from "vitest";
import { isOfflineResourceOwnedBy, validateOfflineResourcePackMetadata } from "../offline-library";

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

  it("accepts bounded portable metadata", () => {
    expect(() => validateOfflineResourcePackMetadata({
      title: "AS Physics: Waves",
      subject: "Physics",
      syllabus: "9702",
      topic: "Wave motion",
      publisher: "Shadecode",
    })).not.toThrow();
  });

  it("rejects non-string, oversized and control-character metadata", () => {
    expect(() => validateOfflineResourcePackMetadata({
      title: "AS Physics",
      subject: { unexpected: true } as unknown as string,
    })).toThrow("invalid subject metadata");
    expect(() => validateOfflineResourcePackMetadata({
      title: "AS Physics",
      publisher: "x".repeat(501),
    })).toThrow("invalid publisher metadata");
    expect(() => validateOfflineResourcePackMetadata({
      title: "AS Physics",
      topic: "Waves\u0000",
    })).toThrow("invalid topic metadata");
    expect(() => validateOfflineResourcePackMetadata({
      title: "Bad\nTitle",
    })).toThrow("invalid resource title");
  });
});
