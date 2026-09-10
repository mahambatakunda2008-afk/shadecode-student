import type { ActivityLabel, CodeLabActivityMetadata, CurriculumIdentity, CurriculumObjective, CurriculumProvenance } from "@/lib/curriculum/objective-first";
import { classifyActivity } from "@/lib/curriculum/objective-first";
import { isContentAligned, sameLearningScope, type LearningScope, type LearningScopeIdentity } from "./learning-scope";

export type CodeLabActivityType = "trace" | "write" | "debug" | "predict" | "refactor" | "exam-task";
export interface CodeLabActivity extends CodeLabActivityMetadata {
  title: string; description: string; type: CodeLabActivityType; difficulty: 1 | 2 | 3 | 4 | 5; skillIds: string[];
  /** References any verified item in the complete learning scope, not only objectives. */
  contentIds?: string[];
  /** Course/module/scope identifier for tertiary and professional contexts. */
  scopeId?: string;
  prerequisiteActivityIds?: string[]; required?: boolean;
}
export interface CodeLabMastery { activityId: string; mastery: number; attempts: number; completed: boolean; }
export interface CodeLabContext {
  learner: CurriculumIdentity;
  objectives: CurriculumObjective[];
  skills: { id: string; name: string; description?: string }[];
  mappings: { objectiveId: string; skillId: string; status: "draft" | "verified"; provenance: CurriculumProvenance }[];
}
export interface UniversalCodeLabContext { learnerScope: LearningScopeIdentity; authoritativeScopes: LearningScope[]; }
export interface CodeLabSelection { activities: CodeLabActivity[]; blockedActivities: CodeLabActivity[]; reason: string; }
export interface UniversalCodeLabSelection { aligned: CodeLabActivity[]; general: CodeLabActivity[]; blocked: CodeLabActivity[]; reason: string; }

function sameIdentity(a?: CurriculumIdentity, b?: CurriculumIdentity): boolean {
  if (!a || !b) return false;
  return a.boardId === b.boardId && a.qualificationId === b.qualificationId && a.level === b.level && a.syllabusId === b.syllabusId && a.syllabusVersion === b.syllabusVersion && a.subjectId === b.subjectId && (b.paperOrComponentId === undefined || a.paperOrComponentId === b.paperOrComponentId);
}
export function selectCodeLabActivities(context: CodeLabContext, activities: CodeLabActivity[]): CodeLabSelection {
  const objectiveIds = new Set(context.objectives.filter((o) => o.status === "verified").map((o) => o.id));
  const eligible: CodeLabActivity[] = [], blocked: CodeLabActivity[] = [];
  for (const activity of activities) {
    const identityOk = sameIdentity(activity.curriculum, context.learner);
    const ids = activity.objectiveIds ?? [];
    if (identityOk && ids.length > 0 && ids.every((id) => objectiveIds.has(id)) && activity.mappingVerified === true && activity.enrichment !== true) eligible.push(activity);
    else blocked.push(activity);
  }
  return { activities: eligible, blockedActivities: blocked, reason: eligible.length ? "Code Lab activities are restricted to the exact verified curriculum objectives." : "No verified Code Lab activities are available for this learner's exact curriculum context." };
}

/** Universal selector: complete verified content scope is the alignment gate. */
export function selectUniversalCodeLabActivities(context: UniversalCodeLabContext, activities: CodeLabActivity[]): UniversalCodeLabSelection {
  const matchingScopes = context.authoritativeScopes.filter((scope) => sameLearningScope(scope.identity, context.learnerScope));
  const aligned: CodeLabActivity[] = [], general: CodeLabActivity[] = [], blocked: CodeLabActivity[] = [];
  for (const activity of activities) {
    const scope = matchingScopes.find((candidate) => !activity.scopeId || candidate.identity.courseId === activity.scopeId || candidate.identity.moduleId === activity.scopeId);
    if (scope && isContentAligned(activity.contentIds ?? [], scope)) aligned.push(activity);
    else if (!activity.curriculum && !activity.contentIds?.length && activity.enrichment === true) general.push(activity);
    else blocked.push(activity);
  }
  return { aligned, general, blocked, reason: aligned.length ? "Activities are grounded in the learner's verified content scope." : "No verified content-aligned activities are available for this academic context." };
}

export function activityLabel(activity: CodeLabActivity): ActivityLabel { return classifyActivity(activity); }
export function isActivityUnlocked(activity: CodeLabActivity, mastery: CodeLabMastery[]): boolean {
  const completed = new Set(mastery.filter((m) => m.completed || m.mastery >= 80).map((m) => m.activityId));
  return (activity.prerequisiteActivityIds ?? []).every((id) => completed.has(id));
}
export function recommendCodeLabActivity(activities: CodeLabActivity[], mastery: CodeLabMastery[]): CodeLabActivity | null {
  const masteryById = new Map(mastery.map((m) => [m.activityId, m]));
  return activities.filter((a) => isActivityUnlocked(a, mastery)).filter((a) => (masteryById.get(a.activityId)?.mastery ?? 0) < 80).sort((a, b) => {
    const am = masteryById.get(a.activityId)?.mastery ?? 0, bm = masteryById.get(b.activityId)?.mastery ?? 0;
    if (am !== bm) return am - bm; if (a.required !== b.required) return a.required ? -1 : 1; return a.difficulty - b.difficulty;
  })[0] ?? null;
}
export function objectiveCoverage(activities: CodeLabActivity[], objectives: CurriculumObjective[]) {
  return objectives.map((objective) => ({ objectiveId: objective.id, code: objective.code, statement: objective.statement, activityCount: activities.filter((a) => a.objectiveIds?.includes(objective.id)).length }));
}
