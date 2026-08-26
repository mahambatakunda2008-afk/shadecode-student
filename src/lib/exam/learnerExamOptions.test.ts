import { describe, expect, it } from "vitest";
import { canGenerateExamForSubject, getLearnerExamLevel } from "./learnerExamOptions";
import type { LearnerContext } from "@/lib/learner/context";

const base: LearnerContext = { userId: "test-user", stage: "advanced_secondary", board: "cambridge", qualification: "AS & A Level", syllabusCode: "9702", syllabusYear: "2027", subjects: ["Physics"], onboardingComplete: true };

describe("learner exam options", () => {
  it("derives advanced level from learner context", () => expect(getLearnerExamLevel(base).id).toBe("advanced"));
  it("only allows enrolled subjects", () => {
    expect(canGenerateExamForSubject(base, "Physics")).toBe(true);
    expect(canGenerateExamForSubject(base, "Chemistry")).toBe(false);
  });
});
