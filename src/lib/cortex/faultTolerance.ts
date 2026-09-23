/**
 * Cortex fault-tolerance primitives.
 *
 * These helpers are deliberately dependency-free so every Cortex engine can use
 * the same recovery rules without importing provider-specific code.
 */

export type CortexFailureClass =
  | "transient"
  | "rate_limit"
  | "offline"
  | "invalid_output"
  | "quality_failure"
  | "auth"
  | "permission"
  | "validation"
  | "persistence"
  | "configuration"
  | "unknown";

export type CortexRecoveryAction =
  | "retry"
  | "retry_with_backoff"
  | "fallback_local"
  | "repair"
  | "resume"
  | "surface"
  | "abort";

export interface CortexFailure {
  class: CortexFailureClass;
  action: CortexRecoveryAction;
  retryable: boolean;
  message: string;
  cause?: unknown;
}

export interface CortexStage {
  id: string;
  label: string;
  weight: number;
}

export interface CortexProgress {
  stage: string;
  completedStages: number;
  totalStages: number;
  completedUnits: number;
  totalUnits: number;
  percent: number;
}

export const CORTEX_DEFAULT_RETRY_LIMIT = 5;
export const CORTEX_MAX_BACKOFF_MS = 8_000;

export function classifyCortexFailure(error: unknown, status?: number): CortexFailureClass {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();

  if (typeof navigator !== "undefined" && navigator.onLine === false) return "offline";
  if (status === 401 || status === 403 || /unauthori[sz]ed|forbidden|invalid token/.test(message)) return "auth";
  if (status === 400 || status === 422 || /validation failed|invalid request/.test(message)) return "validation";
  if (status === 429 || /rate limit|too many requests|quota/.test(message)) return "rate_limit";
  if (status === 408 || status === 409 || status === 425 || (status !== undefined && status >= 500)) return "transient";
  if (/timeout|timed out|aborted|temporarily unavailable|service unavailable|econnreset|network/.test(message)) return "transient";
  if (/json|parse|schema|malformed|invalid output/.test(message)) return "invalid_output";
  if (/quality|depth|lesson standard|too thin|failed the learning/.test(message)) return "quality_failure";
  if (/save|persist|database|supabase|insert|update/.test(message)) return "persistence";
  if (/missing .*environment|configuration|api key|credentials/.test(message)) return "configuration";
  if (/permission|row level security|rls/.test(message)) return "permission";
  return "unknown";
}

export function recoveryForFailure(kind: CortexFailureClass): CortexRecoveryAction {
  switch (kind) {
    case "offline": return "resume";
    case "rate_limit":
    case "transient": return "retry_with_backoff";
    case "invalid_output": return "repair";
    case "quality_failure": return "repair";
    case "persistence": return "resume";
    case "auth":
    case "permission":
    case "validation":
    case "configuration": return "surface";
    default: return "retry";
  }
}

export function toCortexFailure(error: unknown, status?: number): CortexFailure {
  const kind = classifyCortexFailure(error, status);
  const message = error instanceof Error ? error.message : String(error ?? "Unknown Cortex failure");
  const action = recoveryForFailure(kind);
  return {
    class: kind,
    action,
    retryable: ["offline", "rate_limit", "transient", "invalid_output", "quality_failure", "persistence", "unknown"].includes(kind),
    message,
    cause: error,
  };
}

export function retryDelay(attempt: number, maxMs = CORTEX_MAX_BACKOFF_MS) {
  const safeAttempt = Math.max(0, Math.floor(attempt));
  const exponential = Math.min(maxMs, 500 * 2 ** safeAttempt);
  const jitter = Math.floor(Math.random() * 250);
  return Math.min(maxMs, exponential + jitter);
}

/**
 * Progress is evidence-based. Never advance a unit until that unit is actually
 * complete. This keeps the UI honest when a provider stalls or a retry happens.
 */
export function calculateCortexProgress(input: {
  completedUnits: number;
  totalUnits: number;
  stageIndex: number;
  totalStages: number;
}): number {
  const units = Math.max(0, input.totalUnits);
  const completedUnits = Math.min(units, Math.max(0, input.completedUnits));
  const unitRatio = units > 0 ? completedUnits / units : 0;
  const stageRatio = input.totalStages > 0
    ? Math.min(1, Math.max(0, input.stageIndex / input.totalStages))
    : 0;
  return Math.round((stageRatio * 0.35 + unitRatio * 0.65) * 100);
}

export function shouldRetry(attempt: number, limit = CORTEX_DEFAULT_RETRY_LIMIT) {
  return attempt < Math.max(0, limit);
}

export function isTerminalFailure(kind: CortexFailureClass) {
  return ["auth", "permission", "validation", "configuration"].includes(kind);
}

export function mergePartial<T>(existing: T[], incoming: T[], key: (item: T) => string) {
  const merged = new Map(existing.map(item => [key(item), item]));
  for (const item of incoming) merged.set(key(item), item);
  return [...merged.values()];
}
