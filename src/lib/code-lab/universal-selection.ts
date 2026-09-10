import type { CodeLabActivity } from "./code-lab";
import { isContentAligned, sameLearningScope, type LearningScope, type LearningScopeIdentity } from "./learning-scope";

export interface UniversalCodeLabContext { learnerScope: LearningScopeIdentity; authoritativeScopes: LearningScope[]; }
export interface UniversalCodeLabSelection { aligned: CodeLabActivity[]; general: CodeLabActivity[]; blocked: CodeLabActivity[]; reason: string; }

export function selectUniversalCodeLabActivities(context: UniversalCodeLabContext, activities: CodeLabActivity[]): UniversalCodeLabSelection {
  const matchingScopes = context.authoritativeScopes.filter((scope) => sameLearningScope(scope.identity, context.learnerScope));
  const aligned: CodeLabActivity[] = [], general: CodeLabActivity[] = [], blocked: CodeLabActivity[] = [];
  for (const activity of activities) {
    const scope = matchingScopes.find((candidate) => !activity.scopeId || candidate.identity.courseId === activity.scopeId || candidate.identity.moduleId === activity.scopeId || candidate.identity.syllabusId === activity.scopeId);
    const contentIds = activity.contentIds ?? [];
    if (scope && isContentAligned(contentIds, scope)) aligned.push(activity);
    else if (!activity.curriculum && contentIds.length === 0 && activity.enrichment === true) general.push(activity);
    else blocked.push(activity);
  }
  return { aligned, general, blocked, reason: aligned.length ? "Activities are grounded in the learner's verified content scope." : "No verified content-aligned activities are available for this academic context." };
}
