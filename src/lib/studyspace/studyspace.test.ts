import { describe, expect, it } from "vitest";
import { createExamWork, createWorkmateWork } from "./adapters";
import { isWorkObject } from "./validation";

describe("StudySpace work objects", () => {
  it("creates a valid exam work object without requiring a subject", () => {
    const work = createExamWork({ prompt: "Explain this problem" });
    expect(work.mode).toBe("exam");
    expect(work.status).toBe("draft");
    expect(work.subject).toBeUndefined();
    expect(isWorkObject(work)).toBe(true);
  });

  it("supports arbitrary subjects without a whitelist", () => {
    const work = createWorkmateWork({ subject: "Agricultural Science", response: "My answer" });
    expect(work.subject).toBe("Agricultural Science");
    expect(isWorkObject(work)).toBe(true);
  });

  it("rejects invalid modes and statuses", () => {
    expect(isWorkObject({ id: "x", mode: "not-a-mode", createdAt: "now", updatedAt: "now" })).toBe(false);
    expect(isWorkObject({ id: "x", mode: "exam", status: "broken", createdAt: "now", updatedAt: "now" })).toBe(false);
  });
});
