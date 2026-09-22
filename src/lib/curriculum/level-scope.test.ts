import { describe, expect, it } from "vitest";
import { objectiveVisibleAtLevel } from "./level-scope";

describe("objectiveVisibleAtLevel", () => {
  it("hides A-Level-only objectives from AS Level learners", () => {
    expect(objectiveVisibleAtLevel("a_level", "as_level")).toBe(false);
  });
  it("shows AS objectives to AS learners and everything to A Level learners", () => {
    expect(objectiveVisibleAtLevel("as_level", "as_level")).toBe(true);
    expect(objectiveVisibleAtLevel("as_level", "a_level")).toBe(true);
    expect(objectiveVisibleAtLevel("a_level", "a_level")).toBe(true);
  });
  it("leaves single-level and unlabelled syllabi untouched", () => {
    expect(objectiveVisibleAtLevel("igcse", "igcse")).toBe(true);
    expect(objectiveVisibleAtLevel(null, "as_level")).toBe(true);
    expect(objectiveVisibleAtLevel(undefined, "as_level")).toBe(true);
    expect(objectiveVisibleAtLevel("a_level", "igcse")).toBe(true);
  });
});
