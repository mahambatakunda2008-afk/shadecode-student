export type LearningMode = "classic" | "ai";

export const LEARNING_MODE_KEY = "shadecode:learning-mode:v1";
export const DEFAULT_LEARNING_MODE: LearningMode = "classic";

export function normalizeLearningMode(value: unknown): LearningMode {
  return value === "ai" ? "ai" : "classic";
}

export function getLearningMode(): LearningMode {
  if (typeof window === "undefined") return DEFAULT_LEARNING_MODE;
  try {
    return normalizeLearningMode(window.localStorage.getItem(LEARNING_MODE_KEY));
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
