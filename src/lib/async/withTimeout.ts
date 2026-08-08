/**
 * src/lib/async/withTimeout.ts
 *
 * Generic Promise-level timeout wrapper. src/lib/ai.ts already has a
 * fetch-specific timeout pattern (AbortController), but that only works
 * for direct fetch() calls -- it doesn't help composed async functions
 * like getStudentIntelligence() that fan out into multiple internal
 * services (Supabase queries, Cortex reads) with no fetch/abort signal
 * to hook into. This is the Promise-level equivalent for that case.
 *
 * Addresses the dashboard reliability requirement in
 * docs/DASHBOARD_REDESIGN_SPEC.md §7: "Any underlying API/provider call
 * that can block the dashboard must have bounded timeout behavior... no
 * permanent spinner." Without this, an unresolved (not rejected --
 * genuinely never-settling) inner promise leaves a caller's loading
 * state true forever, since nothing ever throws and `finally` never runs.
 */

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = `Operation timed out after ${timeoutMs}ms`
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new TimeoutError(timeoutMessage)), timeoutMs);
    }),
  ]);
}
