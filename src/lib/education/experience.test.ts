import { describe, expect, it } from "vitest";
import { getExperienceProfile, primaryGradeStage } from "./experience";
import { getPrimaryExperience } from "./primaryExperience";

describe("education experience profiles", () => {
  it("keeps early primary concrete and touch-first", () => {
    const profile = getExperienceProfile("early_primary");
    expect(profile.ui.interaction).toBe("touch");
    expect(profile.learning.explanation).toBe("concrete");
    expect(profile.rewards).toBe("adventure");
  });

  it("makes upper primary distinct without infantilising it", () => {
    const profile = getExperienceProfile("upper_primary");
    expect(profile.ui.motion).toBe("energetic");
    expect(profile.copy.greeting).toContain("challenge");
    expect(profile.learning.defaultQuestionCount).toBeGreaterThan(4);
  });

  it("maps grades 1-3 and 4-7 to different primary experiences", () => {
    expect(primaryGradeStage(1)).toBe("early_primary");
    expect(primaryGradeStage(3)).toBe("early_primary");
    expect(primaryGradeStage(4)).toBe("upper_primary");
    expect(primaryGradeStage(7)).toBe("upper_primary");
  });

  it("limits concept load for younger learners", () => {
    expect(getPrimaryExperience(2).maxConceptsPerLesson).toBe(1);
    expect(getPrimaryExperience(6).maxConceptsPerLesson).toBe(2);
  });
});
