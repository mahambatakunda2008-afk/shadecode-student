export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: number;
}

export interface RetryState {
  attempts: number;
  nextRetryAt: number;
  permanentFailure: boolean;
  lastError?: string;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 6,
  baseDelayMs: 1_000,
  maxDelayMs: 60_000,
  jitter: 0.2,
};

export function nextRetryState(previous: RetryState | null, error: unknown, policy = DEFAULT_RETRY_POLICY, now = Date.now()): RetryState {
  const attempts = (previous?.attempts ?? 0) + 1;
  const permanentFailure = attempts >= policy.maxAttempts;
  if (permanentFailure) return { attempts, nextRetryAt: now, permanentFailure: true, lastError: error instanceof Error ? error.message : String(error) };
  const exponential = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** (attempts - 1));
  const jitter = exponential * policy.jitter * (Math.random() * 2 - 1);
  return {
    attempts,
    nextRetryAt: now + Math.max(0, Math.round(exponential + jitter)),
    permanentFailure: false,
    lastError: error instanceof Error ? error.message : String(error),
  };
}

export function shouldRetry(state: RetryState | null, now = Date.now()): boolean {
  return Boolean(state && !state.permanentFailure && state.nextRetryAt <= now);
}
