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
export function selectHelpResult(value: unknown, level: VerifyHelpLevel): VerifyHelpResult {
  const result = (value && typeof value === "object" ? value : {}) as VerifyHelpResult;
  const common: Pick<VerifyHelpResult, "level" | "problem" | "confidence"> = {
    level,
    ...(typeof result.problem === "string" ? { problem: result.problem } : {}),
    ...(typeof result.confidence === "number" ? { confidence: result.confidence } : {}),
  };

  if (level === "hint") return { ...common, hint: result.hint };
  if (level === "method") return { ...common, method: result.method };

  const solution = typeof result.solution === "string" && result.solution.trim().length >= 20 ? result.solution : result.content;
  return {
    ...common,
    ...(typeof solution === "string" ? { solution } : {}),
    ...(typeof result.finalAnswer === "string" ? { finalAnswer: result.finalAnswer } : {}),
  };
}
