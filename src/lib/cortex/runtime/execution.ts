/**
 * Cortex execution boundary.
 *
 * All model-backed work initiated by Cortex should enter through this module.
 * Provider selection, timeouts, curriculum grounding, telemetry, and provider
 * fallback remain owned by the shared AI runtime. Cortex owns the higher-level
 * decision about *what* work to execute and records the operation identity here.
 */
import { callAI, type CallAIOptions } from "@/lib/ai";

export type CortexExecutionOptions = CallAIOptions & {
  /** Stable Cortex operation name used for telemetry and future execution policy. */
  operation: string;
};

export async function executeCortexText(
  prompt: string,
  maxTokens: number,
  options: CortexExecutionOptions,
): Promise<string | null> {
  const operation = options.operation.trim() || "cortex.text";
  const { operation: _operation, ...aiOptions } = options;

  try {
    return await callAI(prompt, maxTokens, {
      ...aiOptions,
      feature: aiOptions.feature ?? "cortex",
      subfeature: aiOptions.subfeature ?? operation,
    });
  } catch (error) {
    // The shared AI runtime normally converts provider failures into a null
    // result. This boundary also protects Cortex callers if that contract
    // changes, so a provider exception never becomes a Cortex crash.
    console.error("[CortexExecution] execution failed", {
      operation,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
