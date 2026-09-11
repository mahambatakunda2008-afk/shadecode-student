import {
  CURRICULUM_COMPLETENESS_DIMENSIONS,
  evaluateCurriculumCompleteness,
  type CurriculumCompletenessDimension,
  type CurriculumCoverageCheck,
} from "./completeness";
import type { CurriculumExtraction, CurriculumKnowledgeDraft } from "./ingestion";

export type CurriculumVerificationResult = {
  complete: boolean;
  verified: boolean;
  checks: CurriculumCoverageCheck[];
  unresolved: CurriculumCompletenessDimension[];
  documentHash: string;
  knowledgeCount: number;
};

/**
 * Final gate for ingestion jobs. Detection is deliberately separated from
 * verification: a parser may discover material, but only reconciled evidence
 * can mark it verified.
 */
export function verifyCurriculumBundle(
  extraction: CurriculumExtraction,
  knowledge: CurriculumKnowledgeDraft[],
  checks: CurriculumCoverageCheck[],
): CurriculumVerificationResult {
  const result = evaluateCurriculumCompleteness(checks);
  const unresolved = [...result.missing, ...result.partial, ...result.blocked];

  return {
    complete: result.complete,
    verified: result.complete && checks.length === CURRICULUM_COMPLETENESS_DIMENSIONS.length,
    checks,
    unresolved,
    documentHash: extraction.documentHash,
    knowledgeCount: knowledge.length,
  };
}

export function assertProductionVerifiedCurriculum(
  result: CurriculumVerificationResult,
): void {
  if (!result.verified) {
    throw new Error(
      `Curriculum cannot be marked production-verified. Unresolved dimensions: ${result.unresolved.join(", ") || "none"}.`,
    );
  }
}
