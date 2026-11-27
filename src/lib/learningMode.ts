export type LearningMode = "classic" | "ai";

export const LEARNING_MODE_KEY = "shadecode:learning-mode:v1";
export const DEFAULT_LEARNING_MODE: LearningMode = "ai";

export function normalizeLearningMode(value: unknown): LearningMode {
  if (value === "ai") return "ai";
  if (value === "classic") return "classic";
  return DEFAULT_LEARNING_MODE;
}

export function getLearningMode(): LearningMode {
  if (typeof window === "undefined") return DEFAULT_LEARNING_MODE;
  try {
    const stored = window.localStorage.getItem(LEARNING_MODE_KEY);
    return stored === null ? DEFAULT_LEARNING_MODE : normalizeLearningMode(stored);
  } catch {
    return DEFAULT_LEARNING_MODE;
  }
}

export function setLearningMode(mode: LearningMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LEARNING_MODE_KEY, mode);
    window.dispatchEvent(new CustomEvent("shadecode:learning-mode-change", { detail: mode }));
  } catch {
    // Storage can be unavailable in private browsing; the current session can still use the setting.
  }
}
