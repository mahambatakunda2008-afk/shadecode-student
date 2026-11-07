import { describe, expect, it } from "vitest";
import { getPracticalStorageKeys } from "./biology-practical-storage";

describe("getPracticalStorageKeys", () => {
  it("keeps attempts and every practical workspace separate between learners on one browser", () => {
    const alice = getPracticalStorageKeys("learner-a", "biology-9700");
    const ben = getPracticalStorageKeys("learner-b", "biology-9700");

    expect(alice.attempt).not.toBe(ben.attempt);
    expect(alice.drawingPrefix).not.toBe(ben.drawingPrefix);
    expect(alice.graphPrefix).not.toBe(ben.graphPrefix);
    expect(alice.attempt).toContain("learner-a");
    expect(ben.attempt).toContain("learner-b");
  });

  it("returns stable keys for the same learner and practice set", () => {
    expect(getPracticalStorageKeys("learner-a", "biology-9700"))
      .toEqual(getPracticalStorageKeys("learner-a", "biology-9700"));
  });

  it("rejects missing learner identity instead of falling back to shared storage", () => {
    expect(() => getPracticalStorageKeys("", "biology-9700")).toThrow(/learner ID/);
    expect(() => getPracticalStorageKeys("learner-a", " ")).toThrow(/practice-set ID/);
  });

  it("escapes separators in identifiers so namespaces cannot collide", () => {
    const first = getPracticalStorageKeys("a:b", "c");
    const second = getPracticalStorageKeys("a", "b:c");
    expect(first.attempt).not.toBe(second.attempt);
  });
});
