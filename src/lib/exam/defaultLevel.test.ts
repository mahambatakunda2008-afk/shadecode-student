import { describe, expect, it } from "vitest";
import { defaultExamLevelIndex } from "./defaultLevel";

describe("defaultExamLevelIndex", () => {
  it("starts Forms 1-4 learners on O-Level", () => {
    expect(defaultExamLevelIndex("lower-secondary")).toBe(0);
    expect(defaultExamLevelIndex("upper-secondary")).toBe(0);
    expect(defaultExamLevelIndex("primary")).toBe(0);
  });
  it("starts Forms 5-6 learners on A-Level and universities on University", () => {
    expect(defaultExamLevelIndex("a-level")).toBe(1);
    expect(defaultExamLevelIndex("university")).toBe(2);
  });
  it("keeps the previous A-Level default when the stage is unknown or not school", () => {
    for (const value of [undefined, null, "", "professional", "tvet", "something-else"]) expect(defaultExamLevelIndex(value)).toBe(1);
  });
});
