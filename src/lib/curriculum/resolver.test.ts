import { describe, expect, it } from "vitest";
import { resolveCurriculumContext, type CurriculumVersionRecord } from "./resolver";
import type { CurriculumObjective, ObjectiveSkillMapping } from "./objective-first";

const identity = {
  boardId: "zimsec",
  qualificationId: "zimsec-o-level",
  level: "o_level" as const,
  syllabusId: "zimsec-4021",
  syllabusVersion: "2024-2030",
  subjectId: "computer-science",
};

const version: CurriculumVersionRecord = {
  id: "version-1",
  identity,
  status: "verified",
  effectiveFrom: "2024-01-01",
  effectiveTo: "2030-12-31",
};

const objective: CurriculumObjective = {
  id: "objective-1",
  curriculum: identity,
  code: "4.4",
  statement: "Use computers sensibly to generate, implement and document solutions.",
  status: "verified",
  provenance: {
    authority: "ZIMSEC",
    sourceDocument: "official syllabus",
    retrievedAt: "2026-09-09",
    mappingStatus: "verified",
  },
};

const mapping: ObjectiveSkillMapping = {
  objectiveId: "objective-1",
  skillId: "computational-thinking",
  status: "verified",
  provenance: objective.provenance,
};

const learner = { ...identity };

describe("resolveCurriculumContext", () => {
  it("resolves only an exact verified identity", () => {
    const result = resolveCurriculumContext({
      learner,
      versions: [version],
      objectives: [objective],
      mappings: [mapping],
      asOf: "2026-09-09",
    });

    expect(result.status).toBe("resolved");
    expect(result.versionId).toBe("version-1");
    expect(result.objectives).toHaveLength(1);
    expect(result.mappings).toHaveLength(1);
  });

  it("does not infer a syllabus from subject alone", () => {
    const result = resolveCurriculumContext({
      learner: learner as never,
      versions: [],
      objectives: [],
      mappings: [],
    });

    expect(result.status).toBe("unverified");
    expect(result.objectives).toHaveLength(0);
  });

  it("excludes draft objectives and mappings", () => {
    const result = resolveCurriculumContext({
      learner,
      versions: [version],
      objectives: [{ ...objective, status: "draft" }],
      mappings: [{ ...mapping, status: "draft" }],
      asOf: "2026-09-09",
    });

    expect(result.status).toBe("resolved");
    expect(result.objectives).toHaveLength(0);
    expect(result.mappings).toHaveLength(0);
  });

  it("blocks an exact identity when its version is only draft", () => {
    const result = resolveCurriculumContext({
      learner,
      versions: [{ ...version, status: "draft" }],
      objectives: [objective],
      mappings: [mapping],
    });

    expect(result.status).toBe("unverified");
    expect(result.versionId).toBeUndefined();
  });

  it("does not leak a stale effective version", () => {
    const result = resolveCurriculumContext({
      learner,
      versions: [{ ...version, effectiveTo: "2025-12-31" }],
      objectives: [objective],
      mappings: [mapping],
      asOf: "2026-09-09",
    });

    expect(result.status).toBe("unverified");
    expect(result.objectives).toHaveLength(0);
  });
});
