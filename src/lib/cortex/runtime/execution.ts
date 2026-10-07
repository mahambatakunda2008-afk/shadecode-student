/**
 * Cortex execution boundary.
 *
 * All model-backed work initiated by Cortex should enter through this module.
 * Provider selection, timeouts, curriculum grounding, telemetry, and provider
 * fallback remain owned by the shared AI runtime. Cortex owns the higher-level
 * decision about *what* work to execute and records the operation identity here.
 */
import { callAI, type CallAIOptions } from "@/lib/ai";
import {
  classifyCortexExecutionFailure,
  emitCortexExecutionEvent,
} from "./executionEvents";

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
  const startedAt = Date.now();
  const eventContext = {
    operation,
    feature: aiOptions.feature ?? "cortex",
    subfeature: aiOptions.subfeature ?? operation,
    ...(aiOptions.userId ? { userId: aiOptions.userId } : {}),
  };

  emitCortexExecutionEvent({
    type: "cortex.execution.started",
    status: "started",
    ...eventContext,
  });

  try {
    const result = await callAI(prompt, maxTokens, {
      ...aiOptions,
      feature: aiOptions.feature ?? "cortex",
      subfeature: aiOptions.subfeature ?? operation,
    });

    const durationMs = Date.now() - startedAt;

    if (typeof result === "string" && result.trim()) {
      emitCortexExecutionEvent({
        type: "cortex.execution.completed",
        status: "completed",
        durationMs,
        ...eventContext,
      });
      return result;
    }

    emitCortexExecutionEvent({
      type: "cortex.execution.failed",
      status: "failed",
      failureClass: "empty_response",
      durationMs,
      ...eventContext,
    });
    return null;
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const failureClass = classifyCortexExecutionFailure(error);

    console.error("[CortexExecution] execution failed", {
      operation,
      failureClass,
      error: error instanceof Error ? error.message : String(error),
    });

    emitCortexExecutionEvent({
      type: "cortex.execution.failed",
      status: "failed",
      failureClass,
      durationMs,
      ...eventContext,
    });

    return null;
  }
}
