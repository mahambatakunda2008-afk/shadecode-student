import type { RecommendationEngineInput, RecommendationEngineOutput } from "@/lib/recommendation-engine/types";
import { chooseNextBestLearningMove } from "./learningDecision";
import type { LearningDecision } from "@/lib/learning-engine/shadecodeLearningUtility";

export interface ShadowDecision {
  legacy: {
    category: RecommendationEngineOutput["recommendedStudyAction"]["category"] | "unknown";
    action: string;
    priority: RecommendationEngineOutput["recommendedStudyAction"]["priority"] | "unknown";
  } | null;
  slu: LearningDecision | null;
  agreement: "agree" | "disagree" | "unavailable";
  comparedAt: string;
}

/**
 * Compare the existing recommendation with the new deterministic SLU decision.
 *
 * This is intentionally side-effect free. It is suitable for shadow mode,
 * where we want to measure the new system without changing what students see.
 */
export function compareLearningDecisions(
  input: RecommendationEngineInput,
  legacy?: RecommendationEngineOutput | null,
): ShadowDecision {
  const slu = chooseNextBestLearningMove(input);

  if (!legacy) {
    return {
      legacy: null,
      slu,
      agreement: "unavailable",
      comparedAt: new Date().toISOString(),
    };
  }

  const legacyCategory = legacy.recommendedStudyAction.category;
  const sluCategory = slu?.candidate.type ?? null;

  return {
    legacy: {
      category: legacyCategory,
      action: legacy.recommendedStudyAction.action,
      priority: legacy.recommendedStudyAction.priority,
    },
    slu,
    agreement: sluCategory === legacyCategory ? "agree" : "disagree",
    comparedAt: new Date().toISOString(),
  };
}
