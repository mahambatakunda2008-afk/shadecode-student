export type VerifyHelpLevel = "hint" | "method" | "solution";

export type VerifyHelpResult = {
  level?: VerifyHelpLevel;
  problem?: string;
  confidence?: number;
  hint?: string;
  method?: string;
  solution?: string;
  finalAnswer?: string;
  content?: string;
};

export function isValidHelpResult(value: unknown, level: VerifyHelpLevel): value is VerifyHelpResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const result = value as VerifyHelpResult;
  if (level === "hint") return typeof result.hint === "string" && result.hint.trim().length >= 20;
  if (level === "method") return typeof result.method === "string" && result.method.trim().length >= 20;
  return (typeof result.solution === "string" && result.solution.trim().length >= 20) ||
    (typeof result.content === "string" && result.content.trim().length >= 20);
}

/**
 * Strip every assistance field above the level the student selected.
 * Hint and method responses must never carry a hidden final answer.
 */
export function selectHelpResult(value: VerifyHelpResult, level: VerifyHelpLevel): VerifyHelpResult {
  const common: Pick<VerifyHelpResult, "level" | "problem" | "confidence"> = {
    level,
    ...(typeof value.problem === "string" ? { problem: value.problem } : {}),
    ...(typeof value.confidence === "number" ? { confidence: value.confidence } : {}),
  };

  if (level === "hint") return { ...common, hint: value.hint };
  if (level === "method") return { ...common, method: value.method };

  const solution = value.solution ?? value.content;
  return {
    ...common,
    ...(typeof solution === "string" ? { solution } : {}),
    ...(typeof value.finalAnswer === "string" ? { finalAnswer: value.finalAnswer } : {}),
  };
}
