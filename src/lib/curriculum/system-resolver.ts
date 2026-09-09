import type { CurriculumKnowledgeIdentity, CurriculumKnowledgeItem } from "./knowledge";
import { buildSystemCurriculumContext, type SystemCurriculumContext } from "./system-curriculum-context";
import type {
  CurriculumObjective,
  CurriculumIdentity,
  ObjectiveSkillMapping,
} from "./objective-first";
import {
  resolveCurriculumContext,
  type CurriculumVersionRecord,
  type LearnerCurriculumContext,
  type ResolvedCurriculumContext,
} from "./resolver";

export interface SystemCurriculumResolutionInput {
  learner: LearnerCurriculumContext;
  versions: CurriculumVersionRecord[];
  objectives: CurriculumObjective[];
  mappings: ObjectiveSkillMapping[];
  knowledge: CurriculumKnowledgeItem[];
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

/**
 * Single system-wide curriculum gateway.
 *
 * Every curriculum-aware module should resolve through this function rather
 * than implementing its own board/syllabus/version filtering. It deliberately
 * fails closed when the learner identity or verified curriculum version is
 * unavailable.
 */
export function resolveSystemCurriculum(
  input: SystemCurriculumResolutionInput,
): SystemCurriculumResolution {
  const resolved = resolveCurriculumContext(input);

  if (resolved.status !== "resolved" || !resolved.curriculum) {
    return {
      resolved,
      blocked: true,
      reason: resolved.reason,
    };
  }

  const identity = toKnowledgeIdentity(resolved.curriculum);
  const context = buildSystemCurriculumContext(identity, resolved.knowledge, true);

  if (context.knowledge.items.length === 0) {
    return {
      resolved,
      context,
      blocked: true,
      reason: "Curriculum version is verified, but no verified whole-syllabus knowledge is available.",
    };
  }

  return {
    resolved,
    context,
    blocked: false,
    reason: "Verified system-wide curriculum context resolved.",
  };
}

export function requireSystemCurriculum(
  input: SystemCurriculumResolutionInput,
): SystemCurriculumContext {
  const result = resolveSystemCurriculum(input);
  if (result.blocked || !result.context) {
    throw new Error(result.reason);
  }
  return result.context;
}
