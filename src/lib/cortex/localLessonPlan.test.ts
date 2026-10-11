import { describe, expect, it } from "vitest";
import { buildLocalSectionRequirements } from "./localLessonPlan";

describe("local lesson section plan", () => {
  it("gives the final section of a four-section lesson the missing exam and synthesis requirements", () => {
    const final = buildLocalSectionRequirements(3, 4).toLowerCase();
    expect(final).toContain("final section");
    expect(final).toContain("exam transfer");
    expect(final).toContain("misconception");
    expect(final).toContain("summary");
  });

  it("keeps the misconception and exam transfer section before the final synthesis in a six-section lesson", () => {
    const penultimate = buildLocalSectionRequirements(4, 6).toLowerCase();
    const final = buildLocalSectionRequirements(5, 6).toLowerCase();
    expect(penultimate).toContain("exam-style reasoning");
    expect(final).toContain("final section");
    expect(final).toContain("synthesis");
  });

  it("does not refer to impossible section numbers for a single-section lesson", () => {
    expect(buildLocalSectionRequirements(0, 1)).toContain("worked example");
  });
});
