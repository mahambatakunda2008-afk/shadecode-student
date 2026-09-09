import { describe, expect, it } from "vitest";
import {
  normalizeStoredCurriculumIdentities,
  normalizeStoredCurriculumIdentity,
} from "./user-profile";

describe("stored curriculum profile", () => {
  it("accepts only complete exact identities", () => {
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
    })).toBeNull();
  });

  it("drops malformed entries without inventing missing values", () => {
    expect(normalizeStoredCurriculumIdentities([
      { boardId: "cambridge", qualificationId: "igcse", level: "igcse", syllabusId: "0478", syllabusVersion: "2026", subjectId: "computer-science" },
      { boardId: "zimsec", subjectId: "computer-science" },
    ])).toHaveLength(1);
  });
});
