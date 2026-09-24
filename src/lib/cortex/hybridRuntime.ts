/**
 * Cortex hybrid execution policy.
 *
 * "Parallel" means speculative execution is allowed only when the browser-local
 * model is already warm. We do not silently download a large model just because
 * a request arrived. Preparation and deterministic work may still run in parallel.
 */
export type CortexExecutionMode =
  | "deterministic"
  | "local"
  | "cloud"
  | "parallel"
  | "parallel-prep";

export interface HybridExecutionCapabilities {
  online: boolean;
  browserModelReady: boolean;
  browserModelAvailable: boolean;
  cloudAvailable: boolean;
  peerAvailable: boolean;
}

export interface HybridExecutionDecision {
  mode: CortexExecutionMode;
  reason: string;
}

export function chooseHybridExecutionMode(
  capabilities: HybridExecutionCapabilities,
  complexity: "simple" | "generative" | "deep",
): HybridExecutionDecision {
  if (capabilities.browserModelReady && capabilities.cloudAvailable && capabilities.online && complexity !== "simple") {
    return {
      mode: "parallel",
      reason: "A warm local model and cloud path are both available, so race independent generation lanes for latency and resilience.",
    };
  }

  if (capabilities.browserModelAvailable && capabilities.cloudAvailable && capabilities.online) {
    return {
      mode: "parallel-prep",
      reason: "Local execution is possible but not warm. Prepare locally without forcing model download while cloud work proceeds.",
    };
  }

  if (capabilities.browserModelReady) {
    return { mode: "local", reason: "A warm browser-local model is available without a usable cloud lane." };
  }

  if (capabilities.cloudAvailable && capabilities.online) {
    return { mode: "cloud", reason: "Use cloud generation while local inference is unavailable or not warm." };
  }

  return { mode: "deterministic", reason: "Keep Cortex useful with deterministic/offline intelligence." };
}

/**
 * Resolve the first successful lane without allowing an early failure to kill
 * the other lane. The returned promise rejects only when every lane fails.
 */
export async function firstSuccessful<T>(tasks: Array<Promise<T>>): Promise<T> {
  if (!tasks.length) throw new Error("No Cortex execution lanes were provided.");
  return new Promise<T>((resolve, reject) => {
    let remaining = tasks.length;
    const errors: unknown[] = [];

    for (const task of tasks) {
      task.then(resolve).catch((error) => {
        errors.push(error);
        remaining -= 1;
        if (remaining === 0) {
          reject(errors[errors.length - 1] ?? new Error("All Cortex execution lanes failed."));
        }
      });
    }
  });
}
