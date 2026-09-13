import { describe, expect, it } from "vitest";
import {
  normalizeStoredCurriculumIdentities,
  normalizeStoredCurriculumIdentity,
} from "./user-profile";

describe("stored curriculum profile", () => {
  it("accepts an identity once board, qualification, level and subject are present", () => {
    // syllabusId/syllabusVersion are intentionally optional on the stored
    // profile -- a student can select "ZIMSEC, O-Level, Computer Science"
    // before the exact syllabus version is resolved. Full syllabus
    // completeness is enforced later, at resolution time
    // (resolveCurriculumContext), not at storage time.
    expect(normalizeStoredCurriculumIdentity({
      boardId: "zimsec",
      qualificationId: "zimsec-o-level",
      level: "o_level",
      syllabusId: "zimsec-4021",
      syllabusVersion: "2024-2030",
      subjectId: "computer-science",
      subjectName: "Computer Science",
    })).toMatchObject({
      boardId: "zimsec",
      qualificationId: "zimsec-o-level",
      level: "o_level",
      syllabusId: "zimsec-4021",
      syllabusVersion: "2024-2030",
      subjectId: "computer-science",
    });

    expect(normalizeStoredCurriculumIdentity({
      boardId: "zimsec",
      qualificationId: "zimsec-o-level",
      level: "o_level",
      syllabusId: "zimsec-4021",
      subjectId: "computer-science",
    })).toMatchObject({
      boardId: "zimsec",
      qualificationId: "zimsec-o-level",
      level: "o_level",
      subjectId: "computer-science",
      syllabusVersion: undefined,
    });
  });

  it("rejects an identity missing a genuinely required field", () => {
    expect(normalizeStoredCurriculumIdentity({
      boardId: "zimsec",
      qualificationId: "zimsec-o-level",
      level: "o_level",
      // subjectId missing
    })).toBeNull();
  });

  it("drops malformed entries without inventing missing values", () => {
    expect(normalizeStoredCurriculumIdentities([
      { boardId: "cambridge", qualificationId: "igcse", level: "igcse", syllabusId: "0478", syllabusVersion: "2026", subjectId: "computer-science" },
      { boardId: "zimsec", subjectId: "computer-science" },
    ])).toHaveLength(1);
  });
});
