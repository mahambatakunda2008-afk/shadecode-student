/* Cortex execution control-plane events.
 *
 * These events intentionally describe Cortex operations, not individual provider
 * attempts. Provider-level telemetry remains owned by src/lib/ai.ts.
 *
 * Emission is bounded and non-blocking. A telemetry problem must never turn a
 * successful student operation into a failed request.
 */

export type CortexExecutionStatus = "started" | "completed" | "failed";

export type CortexExecutionFailureClass =
  | "timeout"
  | "provider_unavailable"
  | "rate_limited"
  | "invalid_response"
  | "empty_response"
  | "grounding_unavailable"
  | "execution_exception"
  | "aborted"
  | "unknown";

export interface CortexExecutionEvent {
  id: string;
  type: "cortex.execution.started" | "cortex.execution.completed" | "cortex.execution.failed";
  operation: string;
  status: CortexExecutionStatus;
  createdAt: string;
  durationMs?: number;
  feature?: string;
  subfeature?: string;
  userId?: string;
  failureClass?: CortexExecutionFailureClass;
}

type CortexExecutionEventListener = (event: CortexExecutionEvent) => void;

const MAX_BUFFERED_EVENTS = 250;
const bufferedEvents: CortexExecutionEvent[] = [];
const listeners = new Set<CortexExecutionEventListener>();

function createEventId() {
  return `cortex-1791397116475-trd42k4t`;
}

/**
 * Classify an exception without storing the original error message.
 * This keeps control-plane telemetry useful without leaking provider details.
 */
export function classifyCortexExecutionFailure(error: unknown): CortexExecutionFailureClass {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase();

  if (lower.includes("abort") || lower.includes("cancel")) return "aborted";
  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("deadline")) return "timeout";
  if (lower.includes("429") || lower.includes("rate limit") || lower.includes("too many requests")) return "rate_limited";
  if (lower.includes("grounding") || lower.includes("curriculum")) return "grounding_unavailable";
  if (lower.includes("invalid response") || lower.includes("validation") || lower.includes("schema")) return "invalid_response";
  if (lower.includes("provider") || lower.includes("unavailable") || lower.includes("network") || lower.includes("fetch")) return "provider_unavailable";
  return "execution_exception";
}

export function emitCortexExecutionEvent(event: Omit<CortexExecutionEvent, "id" | "createdAt">) {
  try {
    const completeEvent: CortexExecutionEvent = {
      ...event,
      id: createEventId(),
      createdAt: new Date().toISOString(),
    };

    bufferedEvents.push(completeEvent);
    if (bufferedEvents.length > MAX_BUFFERED_EVENTS) bufferedEvents.splice(0, bufferedEvents.length - MAX_BUFFERED_EVENTS);

    // Observability must never block execution. Listener failures are isolated.
    for (const listener of listeners) {
      try {
        listener(completeEvent);
      } catch {
        // Intentionally ignored. Telemetry cannot become a product failure.
      }
    }

    if (process.env.NODE_ENV !== "test") {
      console.info("[CortexExecutionEvent]", completeEvent);
    }

    return completeEvent;
  } catch {
    return null;
  }
}

export function subscribeToCortexExecutionEvents(listener: CortexExecutionEventListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRecentCortexExecutionEvents(limit = 50) {
  return bufferedEvents.slice(Math.max(0, bufferedEvents.length - Math.max(0, limit)));
}

export function clearCortexExecutionEventsForTests() {
  bufferedEvents.length = 0;
  listeners.clear();
}
