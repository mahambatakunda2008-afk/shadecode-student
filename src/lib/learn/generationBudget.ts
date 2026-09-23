/**
 * Lesson generation makes up to two sequential AI calls: a primary attempt, then a repair attempt if
 * the primary's output fails quality checks. Each call previously had its own fixed timeout budget
 * (28000ms + 20000ms = 48000ms worst case), independent of how long the other one actually took. That
 * left no real safety margin under the route's `maxDuration` once request/auth/curriculum-lookup/DB
 * overhead is added, and no margin at all if a provider ever ran long (see ai.ts's hard-race fix for the
 * confirmed case of a provider not honoring its own timeout).
 *
 * This computes the repair call's budget from the time actually remaining in a shared total ceiling, so
 * primary + repair together can never exceed `maxTotalMs`, however long primary took.
 */

export interface RepairBudgetInput {
  /** Wall-clock ms already spent since generation started (i.e. since before the primary call). */
  elapsedMs: number;
  /** Hard ceiling for primary + repair combined, leaving margin under the route's maxDuration. */
  maxTotalMs: number;
  /** The repair call's own preferred budget when time allows (today's default: 20000). */
  preferredMaxChainMs: number;
  /** The repair call's own preferred per-provider budget when time allows (today's default: 9000). */
  preferredPerProviderMaxMs: number;
  /** Below this much remaining time, attempting a repair call isn't worthwhile; skip straight to the deterministic fallback. */
  minViableMs?: number;
}

export interface RepairBudget {
  maxChainMs: number;
  perProviderMaxMs: number;
}

const DEFAULT_MIN_VIABLE_MS = 5000;

/** Returns the repair call's budget, or null when there isn't enough time left to make one worthwhile. */
export function computeRepairBudget(input: RepairBudgetInput): RepairBudget | null {
  const minViableMs = input.minViableMs ?? DEFAULT_MIN_VIABLE_MS;
  const remaining = Math.max(0, input.maxTotalMs - input.elapsedMs);
  if (remaining < minViableMs) return null;
  const maxChainMs = Math.min(input.preferredMaxChainMs, remaining);
  const perProviderMaxMs = Math.min(input.preferredPerProviderMaxMs, maxChainMs);
  return { maxChainMs, perProviderMaxMs };
}
