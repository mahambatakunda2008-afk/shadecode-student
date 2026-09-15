import { describe, expect, it } from "vitest";
import { attachVerifiedCurriculumBinding, getEligibleExercises, isVerifiedCurriculumBinding, matchesCurriculumContext, objectiveIsCurriculumCompatible, officialAlignmentLabel } from "./curriculum";
import { getAlgorithmExercise } from "./assessment";

const binding = {
  board: "ZIMSEC",
  qualification: "O Level",
  level: "Secondary",
  subject: "Computer Science",
  syllabusId: "CS-001",
  syllabusVersion: "2026",
  objectiveId: "alg.selection",
  objectiveLabel: "Selection",
  sourceReference: "verified:syllabus-source",
  verified: true,
};

describe("Comp Lab curriculum contract", () => {
  it("rejects incomplete or unverified bindings", () => {
    expect(isVerifiedCurriculumBinding({ ...binding, verified: false })).toBe(false);
    expect(isVerifiedCurriculumBinding({ ...binding, sourceReference: "" })).toBe(false);
    expect(officialAlignmentLabel()).toBe("practice");
  });

  it("only labels complete verified bindings as official", () => {
    expect(officialAlignmentLabel(binding)).toBe("official");
    expect(objectiveIsCurriculumCompatible({ id: "alg.selection" }, binding)).toBe(true);
    expect(objectiveIsCurriculumCompatible({ id: "alg.arrays" }, binding)).toBe(false);
  });

  it("matches a verified board and syllabus context without changing the runtime", () => {
    const exercise = attachVerifiedCurriculumBinding(getAlgorithmExercise("largest-three")!, binding);
    expect(matchesCurriculumContext(exercise, { context: "secondary", board: "ZIMSEC", qualification: "O Level", level: "Secondary", subject: "Computer Science", syllabusId: "CS-001", syllabusVersion: "2026" })).toBe(true);
    expect(matchesCurriculumContext(exercise, { context: "secondary", board: "Other Board" })).toBe(false);
    expect(matchesCurriculumContext(exercise, { context: "university" })).toBe(false);
    expect(getEligibleExercises([exercise], { context: "secondary", board: "ZIMSEC" })).toHaveLength(1);
  });

  it("refuses to attach a binding to the wrong learning objective", () => {
    expect(() => attachVerifiedCurriculumBinding(getAlgorithmExercise("array-total")!, binding)).toThrow(/objective/);
  });
});
