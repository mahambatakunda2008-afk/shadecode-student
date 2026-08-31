import { describe, expect, it } from "vitest";
import { resolveLearnerEducationProfile } from "./profile";

describe("learner education profile", () => {
  it("derives early primary from Grade 2", () => {
    expect(resolveLearnerEducationProfile({ education_grade: 2 }).stage).toBe("early_primary");
  });

  it("derives upper primary from Grade 6", () => {
    expect(resolveLearnerEducationProfile({ education_grade: 6 }).stage).toBe("upper_primary");
  });

  it("preserves an explicit stage", () => {
    expect(resolveLearnerEducationProfile({ education_stage: "tertiary", education_grade: 6 }).stage).toBe("tertiary");
  });

  it("falls back safely when profile data is incomplete", () => {
    const profile = resolveLearnerEducationProfile({});
    expect(profile.stage).toBe("senior_secondary");
    expect(profile.subjects).toEqual([]);
  });
});
