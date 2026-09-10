import { describe, expect, it } from "vitest";
import { activityLabel, isActivityUnlocked, objectiveCoverage, recommendCodeLabActivity, selectCodeLabActivities } from "./code-lab";
import { validateCodeLabActivity } from "./validation";
import type { CurriculumIdentity, CurriculumObjective } from "@/lib/curriculum/objective-first";
import type { CodeLabActivityDefinition } from "./validation";

const zimsecCs: CurriculumIdentity = {
  boardId: "zimsec",
  qualificationId: "o_level",
  level: "o_level",
  syllabusId: "computer-science-4021",
  syllabusVersion: "2024-2030",
  subjectId: "computer-science",
};

const objective: CurriculumObjective = {
  id: "obj-1",
  curriculum: zimsecCs,
  code: "1.1",
  statement: "Verified syllabus objective",
  status: "verified",
  provenance: {
    authority: "ZIMSEC",
    sourceDocument: "verified syllabus",
    retrievedAt: "2026-09-10",
    mappingStatus: "verified",
  },
};

const activity = (overrides: Partial<CodeLabActivityDefinition> = {}): CodeLabActivityDefinition => ({
  activityId: "a-1",
  title: "Trace a program",
  description: "Trace a short program.",
  type: "trace",
  difficulty: 1,
  skillIds: ["trace"],
  curriculum: zimsecCs,
  objectiveIds: ["obj-1"],
  mappingVerified: true,
  required: true,
  enrichment: false,
  provenance: objective.provenance,
  ...overrides,
});

describe("Code Lab curriculum gate", () => {
  it("keeps exact-board and exact-syllabus activities", () => {
    const selected = selectCodeLabActivities(
      { learner: zimsecCs, objectives: [objective], skills: [], mappings: [] },
      [activity(), activity({ activityId: "wrong", curriculum: { ...zimsecCs, boardId: "cambridge" } })],
    );
    expect(selected.activities.map((item) => item.activityId)).toEqual(["a-1"]);
    expect(selected.blockedActivities).toHaveLength(1);
  });

  it("does not treat enrichment as examinable", () => {
    const item = activity({ enrichment: true });
    expect(activityLabel(item)).toBe("enrichment");
    expect(selectCodeLabActivities({ learner: zimsecCs, objectives: [objective], skills: [], mappings: [] }, [item]).activities).toHaveLength(0);
  });

  it("blocks activities mapped to unverified objectives", () => {
    const item = activity({ objectiveIds: ["missing"] });
    const selected = selectCodeLabActivities({ learner: zimsecCs, objectives: [objective], skills: [], mappings: [] }, [item]);
    expect(selected.activities).toHaveLength(0);
  });

  it("requires verified provenance for required activities", () => {
    const errors = validateCodeLabActivity(activity({ provenance: { ...objective.provenance, mappingStatus: "reviewed" } }), [objective]);
    expect(errors).toContain("Code Lab provenance must be verified before required activity content is published.");
  });

  it("never recommends an activity whose prerequisite is incomplete", () => {
    const prerequisite = activity({ activityId: "pre" });
    const next = activity({ activityId: "next", prerequisiteActivityIds: ["pre"] });
    expect(isActivityUnlocked(next, [])).toBe(false);
    expect(recommendCodeLabActivity([next], [])).toBeNull();
    expect(recommendCodeLabActivity([prerequisite, next], [{ activityId: "pre", mastery: 100, attempts: 2, completed: true }])?.activityId).toBe("next");
  });

  it("reports objective coverage instead of silently assuming coverage", () => {
    expect(objectiveCoverage([activity()], [objective])).toEqual([
      { objectiveId: "obj-1", code: "1.1", statement: "Verified syllabus objective", activityCount: 1 },
    ]);
  });
});
