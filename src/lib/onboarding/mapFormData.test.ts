import { describe, expect, it } from "vitest";
import { mapOnboardingFormData } from "./mapFormData";

describe("mapOnboardingFormData", () => {
  it("persists formal selected subjects separately from broad recommendation interests", () => {
    const result = mapOnboardingFormData({
      studyLevel: "a-level",
      subjects: ["mathematics", "english-language", "geography", "early-literacy"],
    });

    expect(result.subjects).toEqual(["Mathematics", "English Language", "Geography", "Early Literacy"]);
    expect(result.subject_interests).toEqual(["mathematics", "english", "geography", "english"]);
  });

  it("canonicalizes legacy subject IDs and aliases to catalogue names", () => {
    const result = mapOnboardingFormData({
      studyLevel: "upper-secondary",
      subjects: ["maths", "science", "computer-science"],
    });

    expect(result.subjects).toEqual(["Mathematics", "Integrated Science", "Computer Science"]);
  });
});
