import {
  EMPTY_VERIFY_LEARNER_MODEL,
  learnFromVerifyResult,
  type VerifyLearnerModel,
  type VerifyLearningSignal,
} from "./learner-model";

const KEY_PREFIX = "shadecode:cortex:verify-learner-model:v1:";

function keyFor(userId: string) {
  return KEY_PREFIX + encodeURIComponent(userId);
}

export function readVerifyLearnerModel(userId: string): VerifyLearnerModel {
  if (typeof window === "undefined" || !userId) return EMPTY_VERIFY_LEARNER_MODEL;
  try {
    const value = JSON.parse(localStorage.getItem(keyFor(userId)) || "null") as Partial<VerifyLearnerModel> | null;
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

export function recordVerifyLearningSignal(userId: string, signal: VerifyLearningSignal): VerifyLearnerModel {
  if (!userId) return EMPTY_VERIFY_LEARNER_MODEL;
  const next = learnFromVerifyResult(readVerifyLearnerModel(userId), signal);
  try { localStorage.setItem(keyFor(userId), JSON.stringify(next)); } catch { /* Private local learning must never block Verify. */ }
  return next;
}
