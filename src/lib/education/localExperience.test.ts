import { describe, expect, it } from "vitest";
import { resolveLocalExperience } from "./localExperience";

describe("local experience resolution", () => {
  it("resolves primary by grade without network state", () => {
    expect(resolveLocalExperience({ userId: "u", educationGrade: 2, educationSubjects: [], updatedAt: "" }).stage).toBe("early_primary");
    expect(resolveLocalExperience({ userId: "u", educationGrade: 6, educationSubjects: [], updatedAt: "" }).stage).toBe("upper_primary");
  });

  it("supports tertiary aliases", () => {
    expect(resolveLocalExperience({ userId: "u", educationStage: "university", educationSubjects: [], updatedAt: "" }).stage).toBe("tertiary");
    expect(resolveLocalExperience({ userId: "u", educationStage: "polytechnic", educationSubjects: [], updatedAt: "" }).stage).toBe("tertiary");
  });

  it("falls back safely for incomplete profiles", () => {
    expect(resolveLocalExperience(null).stage).toBe("senior_secondary");
  });
});
