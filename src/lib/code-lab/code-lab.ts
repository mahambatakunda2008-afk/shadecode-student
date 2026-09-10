import type {
  ActivityLabel,
  CodeLabActivityMetadata,
  CurriculumIdentity,
  CurriculumObjective,
  CurriculumSkill,
  ObjectiveSkillMapping,
} from "@/lib/curriculum/objective-first";
import { classifyActivity } from "@/lib/curriculum/objective-first";

export type CodeLabActivityType = "trace" | "write" | "debug" | "predict" | "refactor" | "exam-task";

export interface CodeLabActivity extends CodeLabActivityMetadata {
  title: string;
  description: string;
  type: CodeLabActivityType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  skillIds: string[];
  prerequisiteActivityIds?: string[];
  required?: boolean;
}

export interface CodeLabMastery {
  activityId: string;
  mastery: number;
  attempts: number;
  completed: boolean;
}

export interface CodeLabContext {
  learner: CurriculumIdentity;
  objectives: CurriculumObjective[];
  skills: CurriculumSkill[];
  mappings: ObjectiveSkillMapping[];
}

export interface CodeLabSelection {
  activities: CodeLabActivity[];
  blockedActivities: CodeLabActivity[];
  reason: string;
}

function sameIdentity(a?: CurriculumIdentity, b?: CurriculumIdentity): boolean {
  if (!a || !b) return false;
  return (
    a.boardId === b.boardId &&
    a.qualificationId === b.qualificationId &&
    a.level === b.level &&
    a.syllabusId === b.syllabusId &&
    a.syllabusVersion === b.syllabusVersion &&
    a.subjectId === b.subjectId &&
    (b.paperOrComponentId === undefined || a.paperOrComponentId === b.paperOrComponentId)
  );
}

/**
 * Returns only activities that belong to the learner's exact curriculum.
 * No subject-only matching is allowed here.
 */
export function selectCodeLabActivities(
  context: CodeLabContext,
  activities: CodeLabActivity[],
): CodeLabSelection {
  const objectiveIds = new Set(context.objectives.filter((o) => o.status === "verified").map((o) => o.id));

  const eligible: CodeLabActivity[] = [];
  const blocked: CodeLabActivity[] = [];

  for (const activity of activities) {
    const identityOk = sameIdentity(activity.curriculum, context.learner);
    const mappedObjectives = activity.objectiveIds ?? [];
    const objectivesOk = mappedObjectives.length > 0 && mappedObjectives.every((id) => objectiveIds.has(id));
    const mappingOk = activity.mappingVerified === true;
    const enrichment = activity.enrichment === true;

    if (identityOk && objectivesOk && mappingOk && !enrichment) eligible.push(activity);
    else blocked.push(activity);
  }

  return {
    activities: eligible,
    blockedActivities: blocked,
    reason: eligible.length
      ? "Code Lab activities are restricted to the learner's exact verified curriculum objectives."
      : "No verified Code Lab activities are available for this learner's exact curriculum context.",
  };
}

export function activityLabel(activity: CodeLabActivity): ActivityLabel {
  return classifyActivity(activity);
}

export function isActivityUnlocked(
  activity: CodeLabActivity,
  mastery: CodeLabMastery[],
): boolean {
  const completed = new Set(mastery.filter((m) => m.completed || m.mastery >= 80).map((m) => m.activityId));
  return (activity.prerequisiteActivityIds ?? []).every((id) => completed.has(id));
}

/**
 * Picks the next objective-aligned exercise without pretending that an
 * unmastered prerequisite has been learned.
 */
export function recommendCodeLabActivity(
  activities: CodeLabActivity[],
  mastery: CodeLabMastery[],
): CodeLabActivity | null {
  const masteryById = new Map(mastery.map((m) => [m.activityId, m]));
  const candidates = activities
    .filter((activity) => isActivityUnlocked(activity, mastery))
    .filter((activity) => {
      const state = masteryById.get(activity.activityId);
      return !state || state.mastery < 80;
    })
    .sort((a, b) => {
      const am = masteryById.get(a.activityId)?.mastery ?? 0;
      const bm = masteryById.get(b.activityId)?.mastery ?? 0;
      if (am !== bm) return am - bm;
      if (a.required !== b.required) return a.required ? -1 : 1;
      return a.difficulty - b.difficulty;
    });

  return candidates[0] ?? null;
}

export function objectiveCoverage(
  activities: CodeLabActivity[],
  objectives: CurriculumObjective[],
): Array<{ objectiveId: string; code: string; statement: string; activityCount: number }> {
  return objectives.map((objective) => ({
    objectiveId: objective.id,
    code: objective.code,
    statement: objective.statement,
    activityCount: activities.filter((activity) => activity.objectiveIds?.includes(objective.id)).length,
  }));
}
