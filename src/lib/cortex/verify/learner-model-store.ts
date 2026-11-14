import {
  EMPTY_VERIFY_LEARNER_MODEL,
  learnFromVerifyResult,
  type VerifyLearnerModel,
  type VerifyLearningSignal,
} from "./learner-model";

const KEY = "shadecode:cortex:verify-learner-model:v1";

export function readVerifyLearnerModel(): VerifyLearnerModel {
  if (typeof window === "undefined") return EMPTY_VERIFY_LEARNER_MODEL;
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "null") as Partial<VerifyLearnerModel> | null;
    if (!value || value.version !== 1 || !Array.isArray(value.topics)) return EMPTY_VERIFY_LEARNER_MODEL;
    return {
      version: 1,
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date(0).toISOString(),
      topics: value.topics.filter(item =>
        item && typeof item.key === "string" && typeof item.subject === "string" &&
        typeof item.topic === "string" && typeof item.masteryEstimate === "number" &&
        typeof item.attempts === "number" && Array.isArray(item.recentScores) &&
        item.misconceptionCounts && typeof item.misconceptionCounts === "object",
      ).slice(0, 40),
    };
  } catch { return EMPTY_VERIFY_LEARNER_MODEL; }
}

export function recordVerifyLearningSignal(signal: VerifyLearningSignal): VerifyLearnerModel {
  const next = learnFromVerifyResult(readVerifyLearnerModel(), signal);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* Private local learning must never block Verify. */ }
  return next;
}
