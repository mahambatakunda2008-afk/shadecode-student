import { describe, expect, it } from "vitest";
import { defaultExamLevelIndex } from "./defaultLevel";
import { fetchLearnerDifficulty, learnerDifficulty } from "./learnerLevel";

describe("learnerDifficulty uses education_stage first", () => {
  it("maps Forms 1-4 to O-Level", () => {
    for (const stage of ["form 1", "Form 2", "FORM 3", "form 4", "o level", "O-Level", "igcse"]) expect(learnerDifficulty({ educationStage: stage }), stage).toBe("easy");
  });
  it("maps Forms 5-6 and A-Level wording to A-Level", () => {
    for (const stage of ["form 5", "form 6", "as level", "a2 level", "A-Level", "a level", "lower sixth", "Upper Sixth", "AS"]) expect(learnerDifficulty({ educationStage: stage }), stage).toBe("medium");
  });
  it("maps university wording to University", () => {
    for (const stage of ["university", "Undergraduate", "bachelor's degree", "college"]) expect(learnerDifficulty({ educationStage: stage }), stage).toBe("hard");
  });
  it("is not fooled by the real data: Form 6 is stored as upper-secondary", () => {
    expect(learnerDifficulty({ educationStage: "form 6", studyLevel: "upper-secondary" })).toBe("medium");
    expect(learnerDifficulty({ educationStage: "form 4", studyLevel: "lower-secondary" })).toBe("easy");
    expect(learnerDifficulty({ educationStage: "as level", studyLevel: "a-level" })).toBe("medium");
  });
});

describe("learnerDifficulty fallback to study_level", () => {
  it("uses study_level only when it is unambiguous", () => {
    expect(learnerDifficulty({ studyLevel: "lower-secondary" })).toBe("easy");
    expect(learnerDifficulty({ studyLevel: "primary" })).toBe("easy");
    expect(learnerDifficulty({ studyLevel: "a-level" })).toBe("medium");
    expect(learnerDifficulty({ studyLevel: "university" })).toBe("hard");
  });
  it("never guesses for ambiguous or unknown values", () => {
    for (const studyLevel of ["upper-secondary", "tvet", "professional", "", undefined, null]) expect(learnerDifficulty({ studyLevel }), String(studyLevel)).toBeNull();
    expect(learnerDifficulty({})).toBeNull();
    expect(learnerDifficulty({ educationStage: "professional", studyLevel: "professional" })).toBeNull();
  });
});

describe("defaultExamLevelIndex", () => {
  it("starts Forms 1-4 on O-Level, Forms 5-6 on A-Level, university on University", () => {
    expect(defaultExamLevelIndex({ educationStage: "form 2" })).toBe(0);
    expect(defaultExamLevelIndex({ educationStage: "form 6", studyLevel: "upper-secondary" })).toBe(1);
    expect(defaultExamLevelIndex({ studyLevel: "a-level" })).toBe(1);
    expect(defaultExamLevelIndex({ studyLevel: "university" })).toBe(2);
  });
  it("keeps the previous A-Level default when the stage is unknown or ambiguous", () => {
    expect(defaultExamLevelIndex({})).toBe(1);
    expect(defaultExamLevelIndex({ studyLevel: "upper-secondary" })).toBe(1);
    expect(defaultExamLevelIndex({ studyLevel: "professional" })).toBe(1);
  });
});

describe("fetchLearnerDifficulty", () => {
  const clientFor = (data: unknown) => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data }) }) }) }) });
  it("reads the profile stage", async () => {
    expect(await fetchLearnerDifficulty(clientFor({ education_stage: "form 3", study_level: "lower-secondary" }), "u1")).toBe("easy");
    expect(await fetchLearnerDifficulty(clientFor({ education_stage: "form 6", study_level: "upper-secondary" }), "u1")).toBe("medium");
  });
  it("returns null when the profile is missing or the lookup fails, never throwing", async () => {
    expect(await fetchLearnerDifficulty(clientFor(null), "u1")).toBeNull();
    expect(await fetchLearnerDifficulty({ from: () => { throw new Error("db down"); } }, "u1")).toBeNull();
  });
});
