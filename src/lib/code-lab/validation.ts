import type { CodeLabActivity, CodeLabMastery } from "./code-lab";
import type { CurriculumIdentity, CurriculumObjective, CurriculumProvenance } from "@/lib/curriculum/objective-first";

export interface CodeLabActivityDefinition extends CodeLabActivity {
  curriculum: CurriculumIdentity;
  provenance: CurriculumProvenance;
}

/**
 * Authoring guard for syllabus-bound Code Lab content.
 * A required/examinable activity must point to verified objectives and carry
 * verified provenance. Enrichment is allowed, but must remain explicitly
 * labelled as enrichment.
 */
export function validateCodeLabActivity(
  activity: CodeLabActivityDefinition,
  objectives: CurriculumObjective[],
): string[] {
  const errors: string[] = [];
  const verifiedIds = new Set(objectives.filter((o) => o.status === "verified").map((o) => o.id));

  if (!activity.curriculum.boardId || !activity.curriculum.qualificationId || !activity.curriculum.syllabusId || !activity.curriculum.syllabusVersion) {
    errors.push("A syllabus-bound Code Lab activity requires a complete curriculum identity.");
  }

  if (!activity.enrichment && activity.objectiveIds?.length !== undefined) {
    if (!activity.objectiveIds.length) errors.push("Required activities must map to at least one syllabus objective.");
    for (const objectiveId of activity.objectiveIds) {
      if (!verifiedIds.has(objectiveId)) errors.push(`Objective ${objectiveId} is not in the verified objective set.`);
    }
  }

  if (!activity.enrichment && activity.mappingVerified !== true) {
    errors.push("Required activities need a verified objective mapping.");
  }

  if (activity.provenance.mappingStatus !== "verified") {
    errors.push("Code Lab provenance must be verified before required activity content is published.");
  }

  return errors;
}

export function summarizeCodeLabMastery(
  activities: CodeLabActivity[],
  mastery: CodeLabMastery[],
): { total: number; completed: number; masteryPercent: number } {
  if (!activities.length) return { total: 0, completed: 0, masteryPercent: 0 };
  const states = new Map(mastery.map((item) => [item.activityId, item]));
  const completed = activities.filter((activity) => {
    const state = states.get(activity.activityId);
    return Boolean(state?.completed || (state?.mastery ?? 0) >= 80);
  }).length;
  const masteryPercent = Math.round(
    activities.reduce((sum, activity) => sum + Math.min(100, states.get(activity.activityId)?.mastery ?? 0), 0) / activities.length,
  );
  return { total: activities.length, completed, masteryPercent };
}
