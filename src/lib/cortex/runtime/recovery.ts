import type { CortexExecutionFailureClass } from "./executionEvents";

export type CortexRecoveryAction =
  | "use_verified_data"
  | "use_warm_local"
  | "repair_output"
  | "retry_within_budget"
  | "resume_checkpoint"
  | "stop_cleanly";

export interface CortexRecoveryPolicy {
  action: CortexRecoveryAction;
  reason: string;
  automatic: boolean;
  maxAttempts: number;
}

/**
 * Convert an operation-level failure into a safe next action.
 *
 * This function deliberately does not execute the recovery. Feature-specific
 * systems own the actual recovery mechanism because they know what constitutes
 * a valid checkpoint, local fallback, or repair operation.
 */
export function getCortexRecoveryPolicy(
  failureClass: CortexExecutionFailureClass,
  context: {
    hasVerifiedData?: boolean;
    hasWarmLocal?: boolean;
    hasCheckpoint?: boolean;
    supportsRepair?: boolean;
  } = {},
): CortexRecoveryPolicy {
  const {
    hasVerifiedData = false,
    hasWarmLocal = false,
    hasCheckpoint = false,
    supportsRepair = false,
  } = context;

  if (failureClass === "aborted") {
    return {
      action: hasCheckpoint ? "resume_checkpoint" : "stop_cleanly",
      reason: hasCheckpoint
        ? "The operation was interrupted, so resume from its durable checkpoint instead of starting over."
        : "The operation was intentionally interrupted and should not be restarted automatically.",
      automatic: Boolean(hasCheckpoint),
      maxAttempts: 0,
    };
  }

  if (failureClass === "invalid_response") {
    if (supportsRepair) {
      return {
        action: "repair_output",
        reason: "The provider returned unusable structure, so repair the output rather than repeating the entire task.",
        automatic: true,
        maxAttempts: 1,
      };
    }

    if (hasVerifiedData) {
      return {
        action: "use_verified_data",
        reason: "The generated result failed validation, so prefer authoritative local data.",
        automatic: true,
        maxAttempts: 0,
      };
    }
  }

  if (failureClass === "empty_response") {
    if (hasVerifiedData) {
      return {
        action: "use_verified_data",
        reason: "No usable model output was returned; verified local material is safer than repeating the same request.",
        automatic: true,
        maxAttempts: 0,
      };
    }

    if (hasWarmLocal) {
      return {
        action: "use_warm_local",
        reason: "The cloud result was empty; a warm local capability can be used without downloading a new model.",
        automatic: true,
        maxAttempts: 0,
      };
    }
  }

  if (
    failureClass === "timeout" ||
    failureClass === "provider_unavailable" ||
    failureClass === "rate_limited"
  ) {
    if (hasVerifiedData) {
      return {
        action: "use_verified_data",
        reason: "The online lane failed, so switch to verified local material instead of retrying the same provider path.",
        automatic: true,
        maxAttempts: 0,
      };
    }

    if (hasWarmLocal) {
      return {
        action: "use_warm_local",
        reason: "The online lane failed, so switch to an already-warm local capability.",
        automatic: true,
        maxAttempts: 0,
      };
    }

    if (hasCheckpoint) {
      return {
        action: "resume_checkpoint",
        reason: "The operation has durable progress; preserve it and resume from the checkpoint rather than restarting.",
        automatic: true,
        maxAttempts: 0,
      };
    }

    return {
      action: "stop_cleanly",
      reason: "No safer alternate lane is available, so stop without repeating the failed whole operation.",
      automatic: false,
      maxAttempts: 0,
    };
  }

  if (failureClass === "grounding_unavailable") {
    return {
      action: hasVerifiedData ? "use_verified_data" : "stop_cleanly",
      reason: hasVerifiedData
        ? "Use verified curriculum/data grounding already available locally."
        : "Do not invent authoritative curriculum claims when grounding is unavailable.",
      automatic: Boolean(hasVerifiedData),
      maxAttempts: 0,
    };
  }

  if (failureClass === "execution_exception" || failureClass === "unknown") {
    return {
      action: supportsRepair ? "repair_output" : "stop_cleanly",
      reason: supportsRepair
        ? "Attempt one bounded repair because the operation supports it; never restart the entire task."
        : "The failure is not safely classified, so stop rather than guessing or looping.",
      automatic: supportsRepair,
      maxAttempts: supportsRepair ? 1 : 0,
    };
  }

  return {
    action: "stop_cleanly",
    reason: "No safe automatic recovery strategy is known for this failure.",
    automatic: false,
    maxAttempts: 0,
  };
}
