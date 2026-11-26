import { describe, expect, it } from "vitest";
import { buildLearnerCurriculumContext } from "./learner-generation-context";

describe("learner curriculum generation context", () => {
  it("uses the saved study stage and matching subject code as unverified tailoring context", () => {
    const result = buildLearnerCurriculumContext({
      education_stage: "as level",
      curriculum_board: "Cambridge International",
      curriculum_profile: {
        level: "as_level",
        subjectCodes: { maths: "9709", physics: "9702", "computer-science": "9618" },
      },
    }, "Mathematics");

    expect(result.level).toBe("AS Level");
    expect(result.examBoard).toBe("Cambridge International");
    expect(result.promptContext).toContain("Subject/syllabus code reported in learner profile for Mathematics: 9709");
    expect(result.promptContext).toContain("NOT VERIFIED SYLLABUS EVIDENCE");
    expect(result.promptContext).toContain("Do not claim that a topic");
  });

  it("does not attach another subject's syllabus code", () => {
    const result = buildLearnerCurriculumContext({
      curriculum_profile: { subjectCodes: { physics: "9702" } },
    }, "Mathematics");

    expect(result.promptContext).toBe("");
  });

  it("returns no invented curriculum context when the profile is empty", () => {
    expect(buildLearnerCurriculumContext({}, "Mathematics")).toEqual({
      level: "",
      examBoard: "",
      promptContext: "",
    });
  });
});
