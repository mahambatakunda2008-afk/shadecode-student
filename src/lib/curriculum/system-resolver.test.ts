import { describe, expect, it } from "vitest";
import { resolveSystemCurriculum } from "./system-resolver";
import type { CurriculumKnowledgeItem } from "./knowledge";

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

  it("blocks when the version is verified but whole-syllabus knowledge is absent", () => {
    const result = resolveSystemCurriculum({
      learner: identity,
      versions: [{ id: "v1", identity, status: "verified" }],
      objectives: [verifiedObjective],
      mappings: [],
      knowledge: [],
    });

    expect(result.blocked).toBe(true);
    expect(result.reason).toContain("no verified whole-syllabus knowledge");
  });

  it("returns one shared context containing multiple syllabus layers", () => {
    const result = resolveSystemCurriculum({
      learner: identity,
      versions: [{ id: "v1", identity, status: "verified" }],
      objectives: [verifiedObjective],
      mappings: [],
      knowledge: [
        knowledge("topic", "Programming"),
        knowledge("content_scope", "Selection and repetition"),
        knowledge("assessment_requirement", "Practical examination"),
        knowledge("terminology", "Pseudocode"),
      ],
    });

    expect(result.blocked).toBe(false);
    expect(result.context?.supporting).toHaveLength(1);
    expect(result.context?.required).toHaveLength(1);
    expect(result.context?.assessment).toHaveLength(1);
    expect(result.context?.terminology).toHaveLength(1);
  });
});
