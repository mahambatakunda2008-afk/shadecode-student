/**
 * Turn exam evidence into one concrete next learning action.
 * This is deliberately deterministic so the learning loop still works offline.
 */
export type ExamAdaptation = {
  action: "remediate" | "practice" | "challenge" | "review";
  target: string | null;
  reason: string;
  priority: "high" | "medium" | "low";
};

export function buildExamAdaptation(input: {
  percentage: number;
  weakAreas?: string[];
  strongAreas?: string[];
  subject?: string;
  topic?: string;
}): ExamAdaptation {
  const percentage = Math.max(0, Math.min(100, Number(input.percentage) || 0));
  const weak = (input.weakAreas ?? []).map(String).map((x) => x.trim()).filter(Boolean);
  const strong = (input.strongAreas ?? []).map(String).map((x) => x.trim()).filter(Boolean);
  const target = weak[0] || (input.topic?.trim() || null);
  const subject = input.subject?.trim() || "this subject";

  if (weak.length && percentage < 50) {
    return {
      action: "remediate",
      target,
      priority: "high",
      reason: `Start with ${target}. Your exam evidence shows a foundational gap, so rebuild the concept before attempting another full paper.`,
    };
  }

  if (weak.length) {
    return {
      action: "practice",
      target,
      priority: "medium",
      reason: `Practise ${target} with targeted questions, then recheck the same skill before moving on.`,
    };
  }

  if (percentage >= 85 && strong.length) {
    return {
      action: "challenge",
      target: strong[0],
      priority: "low",
      reason: `You are performing strongly in ${strong[0]}. Raise the difficulty there rather than repeating the same level of questions.`,
    };
  }

  if (percentage >= 70) {
    return {
      action: "review",
      target: target || subject,
      priority: "low",
      reason: `Review ${target || subject} briefly, then use a fresh mixed set to confirm that the result holds.`,
    };
  }

  return {
    action: "practice",
    target,
    priority: "medium",
    reason: `Build another focused practice set for ${target || subject} before attempting a full exam again.`,
  };
}
