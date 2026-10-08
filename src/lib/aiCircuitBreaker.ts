/**
 * src/lib/aiCircuitBreaker.ts
 *
 * Stops students waiting on AI providers that are known to be failing.
 *
 * closed    -> AI attempts allowed; failures are counted inside a rolling window.
 * open      -> after `failureThreshold` failures the AI is skipped for `openMs`.
 * half-open -> once `openMs` has passed, exactly one probe request is allowed;
 *              its success closes the breaker, its failure re-opens it.
 *
 * State is per server instance (no shared storage needed). It is only a latency
 * optimisation: callers must still have a fallback, and must only skip the AI
 * when that fallback can actually serve the request.
 */

export interface CircuitBreakerOptions {
  failureThreshold: number;
  windowMs: number;
  openMs: number;
  now?: () => number;
}

export interface CircuitBreaker {
  shouldAttempt(): boolean;
  recordSuccess(): void;
  recordFailure(): void;
  state(): "closed" | "open" | "half-open";
}

export function createCircuitBreaker(options: CircuitBreakerOptions): CircuitBreaker {
  const now = options.now ?? Date.now;
  let failures: number[] = [];
  let openUntil = 0;
  let probing = false;

  const isOpenWindow = () => openUntil > 0 && now() < openUntil;

  return {
    shouldAttempt() {
      if (openUntil === 0) return true;
      if (isOpenWindow()) return false;
      // Half-open: let a single request probe the provider chain.
      if (probing) return false;
      probing = true;
      return true;
    },
    recordSuccess() {
      failures = [];
      openUntil = 0;
      probing = false;
    },
    recordFailure() {
      const current = now();
      probing = false;
      failures = failures.filter((time) => current - time < options.windowMs);
      failures.push(current);
      if (openUntil > 0 || failures.length >= options.failureThreshold) {
        openUntil = current + options.openMs;
        failures = [];
      }
    },
    state() {
      if (openUntil === 0) return "closed";
      return isOpenWindow() ? "open" : "half-open";
    },
  };
}

/** Exam generation: three failures within ten minutes pauses the AI for three minutes. */
export const examAiBreaker = createCircuitBreaker({ failureThreshold: 3, windowMs: 10 * 60_000, openMs: 3 * 60_000 });
