import type { OfflineMutation } from "./mutationQueue";

/**
 * Turns permanently-failed queued mutations into short, user-facing summaries.
 * Raw `lastError` text is only used to classify; it is never shown, since it can
 * contain internal detail. Pure and side-effect free so it is unit-testable.
 */

export type FailureReason = "signed-out" | "wrong-account" | "network" | "conflict" | "server" | "unknown";

export interface FailedChangeSummary {
  /** Stable key for React lists: `${store}:${reason}`. */
  key: string;
  store: string;
  /** Human label for the kind of data, e.g. "Task". */
  label: string;
  count: number;
  reason: FailureReason;
  /** Short explanation + what the student can do. */
  message: string;
}

const STORE_LABELS: Record<string, string> = {
  tasks: "Task",
  subjects: "Subject",
  learn_lessons: "Lesson progress",
  projects: "Project",
  project_evidence: "Project evidence",
  project_milestones: "Project milestone",
};

const REASON_MESSAGES: Record<FailureReason, string> = {
  "signed-out": "Sign in again to finish syncing",
  "wrong-account": "Saved under a different account",
  network: "Couldn't reach the server",
  conflict: "Changed on another device",
  server: "The server had a problem — try again shortly",
  unknown: "Couldn't sync — try again",
};

/** Order matters: the most specific signals are checked first. */
export function classifyFailure(lastError: string | undefined | null): FailureReason {
  const text = (lastError ?? "").toLowerCase();
  if (!text) return "unknown";
  if (/does not match|ownership|forbidden|\b403\b/.test(text)) return "wrong-account";
  if (/authentication required|unauthori[sz]ed|\b401\b|jwt|session/.test(text)) return "signed-out";
  if (/conflict|\b409\b/.test(text)) return "conflict";
  if (/failed to fetch|networkerror|network request|load failed|offline|timed? ?out|econn/.test(text)) return "network";
  if (/sync failed|\b5\d\d\b|server|database|unexpected/.test(text)) return "server";
  return "unknown";
}

export function storeLabel(store: string): string {
  return STORE_LABELS[store] ?? "Change";
}

/** Groups by (store, reason); largest groups first, then alphabetical for stability. */
export function summarizeFailedMutations(
  failed: ReadonlyArray<Pick<OfflineMutation, "store" | "lastError">>,
): FailedChangeSummary[] {
  const groups = new Map<string, FailedChangeSummary>();
  for (const mutation of failed) {
    const reason = classifyFailure(mutation.lastError);
    const key = `${mutation.store}:${reason}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    groups.set(key, {
      key,
      store: mutation.store,
      label: storeLabel(mutation.store),
      count: 1,
      reason,
      message: REASON_MESSAGES[reason],
    });
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}
