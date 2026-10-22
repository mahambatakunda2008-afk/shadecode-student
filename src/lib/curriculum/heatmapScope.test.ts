import { describe, expect, it } from "vitest";
import { filterHeatmapVersionsForLearner } from "./heatmapScope";
import type { StoredCurriculumIdentity } from "./user-profile";

const learnerIdentity: StoredCurriculumIdentity = {
  boardId: "cambridge",
  qualificationId: "alevel",
  level: "a_level",
  syllabusId: "9702",
  syllabusVersion: "2025-2027",
  subjectId: "physics",
};

const versions = [
  { id: "physics", board_id: "cambridge", qualification_id: "alevel", syllabus_id: "9702", syllabus_version: "2025-2027", subject_id: "physics" },
  { id: "geography", board_id: "cambridge", qualification_id: "alevel", syllabus_id: "9696", syllabus_version: "2025-2027", subject_id: "geography" },
  { id: "old-physics", board_id: "cambridge", qualification_id: "alevel", syllabus_id: "9702", syllabus_version: "2022-2024", subject_id: "physics" },
];

describe("filterHeatmapVersionsForLearner", () => {
  it("returns only exact curriculum identities selected by the learner", () => {
    expect(filterHeatmapVersionsForLearner(versions, [learnerIdentity]).map(v => v.id)).toEqual(["physics"]);
  });

  it("fails closed when the learner has no exact curriculum profile", () => {
    expect(filterHeatmapVersionsForLearner(versions, [])).toEqual([]);
  });

  it("does not fall back to subject display names or partial identity matches", () => {
    expect(filterHeatmapVersionsForLearner(versions, [{
      boardId: "cambridge",
      qualificationId: "alevel",
      level: "a_level",
      syllabusId: "9702",
      subjectId: "physics",
    }]).map(v => v.id)).toEqual([]);
  });

  it("allows multiple explicitly selected syllabi without exposing unrelated subjects", () => {
    const geography: StoredCurriculumIdentity = {
      boardId: "cambridge",
      qualificationId: "alevel",
      level: "a_level",
      syllabusId: "9696",
      syllabusVersion: "2025-2027",
      subjectId: "geography",
    };
    expect(filterHeatmapVersionsForLearner(versions, [learnerIdentity, geography]).map(v => v.id)).toEqual(["physics", "geography"]);
  });
});
