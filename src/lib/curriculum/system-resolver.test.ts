import { describe, expect, it } from "vitest";
import { resolveSystemCurriculum } from "./system-resolver";
import type { CurriculumKnowledgeItem, CurriculumKnowledgeKind } from "./knowledge";
import type { CurriculumCoverageRecord } from "./resolver";
import { CURRICULUM_COMPLETENESS_DIMENSIONS } from "./completeness";

const identity = {
  boardId: "zimsec",
  qualificationId: "zimsec-o-level",
  level: "o_level" as const,
  syllabusId: "zimsec-4021",
  syllabusVersion: "2024-2030",
  subjectId: "computer-science",
};

const provenance = {
  authority: "ZIMSEC",
  sourceDocument: "Computer Science Syllabus Forms 1-4, 2024-2030",
  sourceUrl: "https://www5.zimsec.co.zw/syllabi/",
  retrievedAt: "2026-09-09",
  mappingStatus: "verified" as const,
  versionSource: "registry" as const,
};

function knowledge(kind: CurriculumKnowledgeItem["kind"], title: string): CurriculumKnowledgeItem {
  return {
    id: crypto.randomUUID(),
    kind,
    title,
    content: title,
    status: "verified",
    identity,
    provenance,
  };
}

const verifiedObjective = {
  id: crypto.randomUUID(),
  curriculum: identity,
  code: "1.1",
  statement: "Explain core algorithm concepts.",
  status: "verified" as const,
  provenance,
};

// resolveSystemCurriculum sits on top of resolveCurriculumContext's full
// whole-syllabus completeness gate (every required knowledge kind present,
// every coverage dimension verified) -- objectives alone are no longer
// sufficient on their own; that earlier, more lenient contract was
// superseded once the completeness evaluator shipped. These fixtures give a
// minimal complete syllabus for tests that are about something other than
// completeness itself.
const REQUIRED_KNOWLEDGE_KINDS: CurriculumKnowledgeKind[] = [
  "topic", "content_scope", "competency", "skill", "progression", "assessment_requirement",
  "paper_component", "assessment_weighting", "examination_format", "practical_activity",
  "project_requirement", "terminology", "constraint", "guidance", "resource",
];
const completeKnowledge: CurriculumKnowledgeItem[] = REQUIRED_KNOWLEDGE_KINDS.map((kind) => knowledge(kind, kind));
const completeCoverage: CurriculumCoverageRecord[] = CURRICULUM_COMPLETENESS_DIMENSIONS.map((dimension) => ({
  dimension,
  status: "verified",
}));

describe("resolveSystemCurriculum", () => {
  it("blocks when the exact curriculum version is not verified", () => {
    const result = resolveSystemCurriculum({
      learner: identity,
      versions: [],
      objectives: [],
      mappings: [],
      knowledge: [knowledge("topic", "Algorithms")],
    });

    expect(result.blocked).toBe(true);
    expect(result.context).toBeUndefined();
  });

  it("blocks on verified objectives alone when whole-syllabus completeness is missing", () => {
    const result = resolveSystemCurriculum({
      learner: identity,
      versions: [{ id: "v1", identity, status: "verified" }],
      objectives: [verifiedObjective],
      mappings: [],
      knowledge: [],
    });

    expect(result.blocked).toBe(true);
    expect(result.context).toBeUndefined();
  });

  it("blocks when the version is verified but no objectives are verified yet, even with complete knowledge", () => {
    const result = resolveSystemCurriculum({
      learner: identity,
      versions: [{ id: "v1", identity, status: "verified" }],
      objectives: [],
      mappings: [],
      knowledge: completeKnowledge,
      coverageChecks: completeCoverage,
    });

    expect(result.blocked).toBe(true);
    expect(result.reason).toContain("no verified syllabus objectives");
  });

  it("returns one shared context containing multiple syllabus layers once fully complete", () => {
    const result = resolveSystemCurriculum({
      learner: identity,
      versions: [{ id: "v1", identity, status: "verified" }],
      objectives: [verifiedObjective],
      mappings: [],
      knowledge: completeKnowledge,
      coverageChecks: completeCoverage,
    });

    expect(result.blocked).toBe(false);
    expect(result.context?.supporting.length).toBeGreaterThan(0);
    expect(result.context?.required.length).toBeGreaterThan(0);
    expect(result.context?.assessment.length).toBeGreaterThan(0);
    expect(result.context?.terminology.length).toBeGreaterThan(0);
  });
});
