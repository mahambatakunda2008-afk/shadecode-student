import { describe, expect, it } from "vitest";
import { SUBJECT_CATALOG, SUBJECT_CATEGORIES } from "./catalog";

describe("central subject catalogue", () => {
  it("has unique stable IDs and unique canonical names", () => {
    const ids = SUBJECT_CATALOG.map(subject => subject.id);
    const names = SUBJECT_CATALOG.map(subject => subject.name.toLocaleLowerCase());
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it("covers the expected subject families and learner pathways", () => {
    expect(SUBJECT_CATEGORIES).toHaveLength(7);
    for (const name of ["Mathematics", "Physics", "Geography", "Shona", "Computer Science", "Accounting", "Art and Design", "Nursing"]) {
      expect(SUBJECT_CATALOG.some(subject => subject.name === name)).toBe(true);
    }
    const pathways = new Set(SUBJECT_CATALOG.flatMap(subject => subject.pathways));
    for (const pathway of ["early-childhood", "primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent"]) {
      expect(pathways.has(pathway)).toBe(true);
    }
  });

  it("supports canonical aliases without requiring duplicate catalogue entries", () => {
    expect(SUBJECT_CATALOG.find(subject => subject.name === "Mathematics")?.aliases).toContain("Maths");
    expect(SUBJECT_CATALOG.find(subject => subject.name === "English Language")?.aliases).toContain("English");
    expect(SUBJECT_CATALOG.find(subject => subject.name === "Integrated Science")?.aliases).toContain("Science");
  });

  it("keeps selectable status separate from claims about verified curriculum or content", () => {
    expect(SUBJECT_CATALOG.every(subject => !("verified" in subject) && !("lessonCount" in subject))).toBe(true);
  });
});
