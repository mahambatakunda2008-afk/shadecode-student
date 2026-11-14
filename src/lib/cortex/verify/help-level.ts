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


/**
 * Mathematical Help must not silently accept provider output that has lost its
 * notation. Reject obvious equation lines unless they are enclosed in LaTeX
 * delimiters; callers can fail safely instead of showing damaged mathematics.
 */
export function hasCompleteMathematicalMarkup(value: string): boolean {
  const text = value.trim();
  if (!text) return false;

  // Remove only complete, paired math spans. Any equation-like material left
  // outside those spans is damaged/unprotected notation and must be rejected.
  const withoutMath = text
    .replace(/\\\[[\s\S]*?\\\]/g, " ")
    .replace(/\\\([\s\S]*?\\\)/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/\$(?!\$)[^\n$]+?\$/g, " ");

  const hasMath = withoutMath !== text;
  if (!hasMath) return false;

  // An unmatched delimiter is a strong signal that the provider truncated or
  // corrupted the expression before it reached KaTeX.
  if (/\\\[|\\\]|\\\(|\\\)|\$\$?/.test(withoutMath)) return false;

  const unprotectedEquation = /(?:=|≠|≤|≥|→|\\(?:frac|sqrt|begin)\b|\b(?:sin|cos|tan|log|ln)\b)/i;
  return !unprotectedEquation.test(withoutMath);
}

/** Accept only a clean, explicit independent-audit result. */
export function isCleanMathematicalAudit(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const audit = value as { consistent?: unknown; issues?: unknown };
  return audit.consistent === true && Array.isArray(audit.issues) && audit.issues.length === 0;
}
