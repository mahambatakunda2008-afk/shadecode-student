import { describe, expect, it } from "vitest";
import { selectCurriculumIdentityForRequestedSubject, selectExactCurriculumForSubject } from "./subjectCurriculumScope";
import type { StoredCurriculumIdentity } from "./user-profile";

const physics: StoredCurriculumIdentity = {
  boardId: "cambridge",
  qualificationId: "alevel",
  level: "a_level",
  syllabusId: "9702",
  syllabusVersion: "2025-2027",
  subjectId: "physics",
  subjectName: "Physics",
};
const geography: StoredCurriculumIdentity = {
  boardId: "cambridge",
  qualificationId: "alevel",
  level: "a_level",
  syllabusId: "9696",
  syllabusVersion: "2025-2027",
  subjectId: "geography",
  subjectName: "Geography",
};

describe("selectExactCurriculumForSubject", () => {
  it("selects the curriculum belonging to the selected subject", () => {
    expect(selectExactCurriculumForSubject([physics, geography], "subject-geo", "Geography")?.subjectId).toBe("geography");
  });

  it("does not borrow another subject's curriculum", () => {
    expect(selectExactCurriculumForSubject([physics], "subject-geo", "Geography")).toBeNull();
  });

  it("fails closed when the selected subject has no exact syllabus version", () => {
    expect(selectExactCurriculumForSubject([{ ...physics, syllabusVersion: undefined }], "subject-physics", "Physics")).toBeNull();
  });

  it("supports the stored subject ID when the subject name is unavailable", () => {
    expect(selectExactCurriculumForSubject([physics], "physics", "Physics")?.syllabusId).toBe("9702");
  });
});

describe("selectCurriculumIdentityForRequestedSubject", () => {
  it("matches subject names and normalized subject IDs", () => {
    expect(selectCurriculumIdentityForRequestedSubject([physics, geography], "Computer Science")).toBeNull();
    expect(selectCurriculumIdentityForRequestedSubject([physics, geography], "GEOGRAPHY")?.subjectId).toBe("geography");
  });

  it("does not fall back to the only configured curriculum for another requested subject", () => {
    expect(selectCurriculumIdentityForRequestedSubject([physics], "Geography")).toBeNull();
  });
});
