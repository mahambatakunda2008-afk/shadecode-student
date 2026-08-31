import { describe, expect, it } from "vitest";
import { resolveEducationExperience } from "./localProfile";

describe("local education experience resolver", () => {
  it("prefers explicit stage", () => {
    expect(resolveEducationExperience({ educationStage: "a_level", grade: 6 }).stage).toBe("a_level");
  });

  it("derives primary stage locally from grade", () => {
    expect(resolveEducationExperience({ grade: 2 }).stage).toBe("early_primary");
    expect(resolveEducationExperience({ grade: 6 }).stage).toBe("upper_primary");
  });

  it("does not require a network profile", () => {
    const profile = resolveEducationExperience({ grade: 7, subjects: ["Mathematics"] });
    expect(profile.learning.explanation).toBe("concrete");
  });
});
