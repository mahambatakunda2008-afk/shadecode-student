import type { CurriculumKnowledgeIdentity, CurriculumKnowledgeItem } from "./knowledge";
import { buildSystemCurriculumContext, type SystemCurriculumContext } from "./system-curriculum-context";
import type { CurriculumObjective, CurriculumIdentity, ObjectiveSkillMapping } from "./objective-first";
import { resolveCurriculumContext, type CurriculumCoverageRecord, type CurriculumVersionRecord, type LearnerCurriculumContext, type ResolvedCurriculumContext } from "./resolver";

export interface SystemCurriculumResolutionInput {
  learner: LearnerCurriculumContext;
  versions: CurriculumVersionRecord[];
  objectives: CurriculumObjective[];
  mappings: ObjectiveSkillMapping[];
  knowledge: CurriculumKnowledgeItem[];
  coverageChecks?: CurriculumCoverageRecord[];
  asOf?: string;
}

export interface SystemCurriculumResolution {
  resolved: ResolvedCurriculumContext;
  context?: SystemCurriculumContext;
  blocked: boolean;
  reason: string;
}

function toKnowledgeIdentity(identity: CurriculumIdentity): CurriculumKnowledgeIdentity {
  return {
    boardId: identity.boardId,
    qualificationId: identity.qualificationId,
    level: identity.level,
    syllabusId: identity.syllabusId,
    syllabusVersion: identity.syllabusVersion,
    subjectId: identity.subjectId,
    paperComponentId: identity.paperOrComponentId,
  };
}

export function resolveSystemCurriculum(input: SystemCurriculumResolutionInput): SystemCurriculumResolution {
  const resolved = resolveCurriculumContext(input);

  if (resolved.status !== "resolved" || !resolved.curriculum) {
    return { resolved, blocked: true, reason: resolved.reason };
  }

  if (resolved.objectives.length === 0) {
    return { resolved, blocked: true, reason: "Curriculum version is verified, but no verified syllabus objectives are available. Curriculum-aware teaching is blocked until the objective set is verified." };
  }

  if (resolved.knowledge.length === 0) {
    return { resolved, blocked: true, reason: "Curriculum version has no verified whole-syllabus knowledge. Teaching, assessment and syllabus-specific claims are blocked until the full curriculum layers are reconciled." };
  }

  const identity = toKnowledgeIdentity(resolved.curriculum);
  const context = buildSystemCurriculumContext(identity, resolved.knowledge, true, resolved.objectives);
  return { resolved, context, blocked: false, reason: "Verified objective-first curriculum context resolved with verified whole-syllabus knowledge." };
}

export function requireSystemCurriculum(input: SystemCurriculumResolutionInput): SystemCurriculumContext {
  const result = resolveSystemCurriculum(input);
  if (result.blocked || !result.context) throw new Error(result.reason);
  return result.context;
}
