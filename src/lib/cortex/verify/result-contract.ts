import type { VerifyResult } from "@/hooks/useCortexVerify";

/**
 * Shared acceptance contract for AI-assisted Mark Mode results.
 * This validates shape and bounds, not academic correctness or rubric validity.
 */
export function isValidVerifyMarkResult(value: unknown): value is VerifyResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  if (typeof result.problem !== "string") return false;
  if (typeof result.score !== "number" || !Number.isFinite(result.score) || result.score < 0 || result.score > 100) return false;
  if (typeof result.correct !== "boolean") return false;
  if (typeof result.cortexInsight !== "string" || result.cortexInsight.trim().length < 20) return false;
  if (typeof result.feedback !== "string" || result.feedback.trim().length < 20) return false;
  if (!Array.isArray(result.steps) || result.steps.length === 0) return false;
  if (!result.steps.every((item) => {
    if (!item || typeof item !== "object") return false;
    const step = item as Record<string, unknown>;
    return typeof step.description === "string" && step.description.trim().length >= 3 &&
      ["correct", "incorrect", "partial"].includes(String(step.status)) &&
      typeof step.note === "string";
  })) return false;
  if (!Array.isArray(result.marksBreakdown)) return false;
  if (!result.marksBreakdown.every((item) => {
    if (!item || typeof item !== "object") return false;
    const mark = item as Record<string, unknown>;
    return typeof mark.criterion === "string" && mark.criterion.trim().length >= 3 &&
      typeof mark.marksLost === "number" && Number.isFinite(mark.marksLost) && mark.marksLost >= 0 &&
      typeof mark.note === "string";
  })) return false;
  if (result.confidence !== undefined &&
      (typeof result.confidence !== "number" || !Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 1)) return false;
  if (result.needsRetake !== undefined && typeof result.needsRetake !== "boolean") return false;
  if (result.needsRetake === true && typeof result.retakeReason !== "string") return false;
  return true;
}
