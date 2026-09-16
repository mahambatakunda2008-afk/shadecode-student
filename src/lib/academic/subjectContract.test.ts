import { describe, expect, it } from "vitest";
import {
  isAllowedSubject,
  isGeneralSubject,
  matchAllowedSubject,
  normalizeSubjectKey,
  normalizeSubjectNames,
} from "./subjectContract";

describe("subject contract", () => {
  it("normalizes separators and casing consistently", () => {
    expect(normalizeSubjectKey("Computer-Science")).toBe("computer science");
    expect(normalizeSubjectKey("Computer & Science")).toBe("computer and science");
  });

  it("never treats General as a learner subject", () => {
    expect(isGeneralSubject("General")).toBe(true);
    expect(isAllowedSubject("General", ["Mathematics", "Physics"])).toBe(false);
    expect(normalizeSubjectNames(["General", "Physics", "physics"])).toEqual(["Physics"]);
  });

  it("matches configured subjects without requiring exact presentation", () => {
    const subjects = ["Mathematics", "Computer Science", "Physics"];
    expect(isAllowedSubject("computer-science", subjects)).toBe(true);
    expect(matchAllowedSubject("PHYSICS", subjects)).toBe("Physics");
    expect(isAllowedSubject("Chemistry", subjects)).toBe(false);
  });
});
