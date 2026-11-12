import type { RecurringMistake, RepeatedTopicError } from "./mistake-patterns";
import type { SpacedRetrievalEvidence } from "./spaced-retrieval";

export interface EvidenceBasedReviewSuggestion {
  subjectKey: string;
  topicId: string;
  priority: "high" | "standard";
  reason: "repeated_errors" | "retrieval_practice";
  distinctAttempts: number;
  incorrectResponses: number | null;
  lastObservedAt: string | null;
  observedMedianIntervalDays: number | null;
  evidenceState: "evidence_backed_suggestion";
}

/**
 * Creates conservative practice suggestions from observed learner evidence.
 * Repeated errors take priority; otherwise, topics with demonstrated retrieval
 * across multiple days can be offered for another retrieval session.
 *
 * This is not a forgetting model: it never assigns a due date, retention
 * probability, or claim that a topic is overdue.
 */
export function deriveEvidenceBasedReviewSuggestions(input: {
  repeatedTopicErrors: RepeatedTopicError[];
  recurringMistakes: RecurringMistake[];
  spacedRetrieval: SpacedRetrievalEvidence[];
}): EvidenceBasedReviewSuggestion[] {
  const repeated = new Map<string, RepeatedTopicError>();
  for (const item of input.repeatedTopicErrors) {
    const key = `${item.subjectKey.trim().toLocaleLowerCase()}\u0000${item.topicId.trim().toLocaleLowerCase()}`;
    const current = repeated.get(key);
    if (!current || item.distinctAttempts > current.distinctAttempts) repeated.set(key, item);
  }

  const diagnosed = new Map<string, RecurringMistake>();
  for (const item of input.recurringMistakes) {
    const key = `${item.subjectKey.trim().toLocaleLowerCase()}\u0000${item.topicId.trim().toLocaleLowerCase()}`;
    const current = diagnosed.get(key);
    if (!current || item.distinctAttempts > current.distinctAttempts) diagnosed.set(key, item);
  }

  const suggestions = new Map<string, EvidenceBasedReviewSuggestion>();
  for (const [key, item] of repeated) {
    const mistake = diagnosed.get(key);
    suggestions.set(key, {
      subjectKey: item.subjectKey,
      topicId: item.topicId,
      priority: "high",
      reason: "repeated_errors",
      distinctAttempts: Math.max(item.distinctAttempts, mistake?.distinctAttempts ?? 0),
      incorrectResponses: item.incorrectResponses,
      lastObservedAt: item.lastObservedAt ?? mistake?.lastObservedAt ?? null,
      observedMedianIntervalDays: null,
      evidenceState: "evidence_backed_suggestion",
    });
  }

  for (const item of input.spacedRetrieval) {
    const key = `${item.subjectKey.trim().toLocaleLowerCase()}\u0000${item.topicId.trim().toLocaleLowerCase()}`;
    if (suggestions.has(key)) continue;
    suggestions.set(key, {
      subjectKey: item.subjectKey,
      topicId: item.topicId,
      priority: "standard",
      reason: "retrieval_practice",
      distinctAttempts: item.distinctAttempts,
      incorrectResponses: null,
      lastObservedAt: item.lastRetrievedAt,
      observedMedianIntervalDays: item.medianIntervalDays,
      evidenceState: "evidence_backed_suggestion",
    });
  }

  return [...suggestions.values()].sort((a, b) =>
    (a.priority === b.priority ? 0 : a.priority === "high" ? -1 : 1) ||
    b.distinctAttempts - a.distinctAttempts,
  );
}
