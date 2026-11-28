import { describe, expect, it } from "vitest";
import { matchesCachedClassicLesson } from "./classicLessonCache";

describe("Classic cached lesson matching", () => {
  it("rejects missing saved topics instead of matching an empty substring", () => {
    expect(matchesCachedClassicLesson("Physics", "wave interference", "Physics", "", "A general physics lesson")).toBe(false);
  });
  it("matches the same subject and exact topic", () => {
    expect(matchesCachedClassicLesson("Physics", "Wave Interference", "Physics", "wave interference", "Interference")).toBe(true);
  });
  it("never matches a cached lesson from another subject", () => {
    expect(matchesCachedClassicLesson("Physics", "wave interference", "Mathematics", "wave interference", "Wave interference")).toBe(false);
  });
});
