import { describe, expect, it } from "vitest";
import {
  canTreatAsExaminable,
  classifyActivity,
  hasCompleteCurriculumIdentity,
  type CodeLabActivityMetadata,
} from "./objective-first";

const zimsecOLevelComputerScience = {
  boardId: "zimsec",
  qualificationId: "zimsec-o-level",
  level: "o_level" as const,
  syllabusId: "zimsec-4021",
  syllabusVersion: "pending-verification",
  subjectId: "computer-science",
};

describe("objective-first Code Lab gating", () => {
  it("accepts a complete learner curriculum identity", () => {
    expect(hasCompleteCurriculumIdentity(zimsecOLevelComputerScience)).toBe(true);
  });

  it("does not make content examinable without a verified mapping", () => {
    const activity: CodeLabActivityMetadata = {
      activityId: "python-loops",
      curriculum: zimsecOLevelComputerScience,
      objectiveIds: ["objective.pending"],
      mappingVerified: false,
    };

    expect(canTreatAsExaminable(activity)).toBe(false);
    expect(classifyActivity(activity)).toBe("unverified");
  });

  it("keeps explicit enrichment separate from exam content", () => {
    const activity: CodeLabActivityMetadata = {
      activityId: "react-dashboard",
      curriculum: zimsecOLevelComputerScience,
      enrichment: true,
      objectiveIds: ["not-a-syllabus-objective"],
      mappingVerified: true,
    };

    expect(canTreatAsExaminable(activity)).toBe(false);
    expect(classifyActivity(activity)).toBe("enrichment");
  });

  it("does not infer curriculum context from a subject alone", () => {
    const activity: CodeLabActivityMetadata = {
      activityId: "database-intro",
      objectiveIds: ["objective.unknown"],
      mappingVerified: true,
    };

    expect(hasCompleteCurriculumIdentity(activity.curriculum)).toBe(false);
    expect(canTreatAsExaminable(activity)).toBe(false);
    expect(classifyActivity(activity)).toBe("unverified");
  });

  it("requires a syllabus version, preventing silent current-version assumptions", () => {
    // Intentionally malformed runtime fixture: production metadata requires a
    // syllabus version, but the runtime gate must still reject its absence.
    const withoutVersion = {
      boardId: zimsecOLevelComputerScience.boardId,
      qualificationId: zimsecOLevelComputerScience.qualificationId,
      level: zimsecOLevelComputerScience.level,
      syllabusId: zimsecOLevelComputerScience.syllabusId,
      subjectId: zimsecOLevelComputerScience.subjectId,
    };
    const activity = {
      activityId: "version-sensitive-content",
      curriculum: withoutVersion,
      objectiveIds: ["objective.verified"],
      mappingVerified: true,
    } as unknown as CodeLabActivityMetadata;

    expect(canTreatAsExaminable(activity)).toBe(false);
  });
});
