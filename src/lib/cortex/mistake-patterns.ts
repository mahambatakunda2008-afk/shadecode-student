export interface MistakeEventRecord {
  type?: unknown;
  data?: unknown;
  created_at?: unknown;
}

export interface RepeatedTopicError {
  subjectKey: string;
  topicId: string;
  incorrectResponses: number;
  distinctAttempts: number;
  lastObservedAt: string | null;
  evidenceState: "repeated_topic_errors";
}

/**
 * Detects repeated topic-level errors only when the same learner has incorrect
 * responses in at least two distinct attempts. Multiple questions in one exam
 * count as one attempt, not a recurring weakness.
 *
 * This deliberately does not infer a specific misconception from a wrong
 * answer. Specific recurring diagnoses are handled separately and require a
 * stable mistakeId emitted by the deterministic marking pipeline.
 */
export function deriveRepeatedTopicErrors(
  rows: MistakeEventRecord[],
): RepeatedTopicError[] {
  const groups = new Map<string, {
    subjectKey: string;
    topicId: string;
    attemptIds: Set<string>;
    incorrectResponses: number;
    lastObservedAt: string | null;
  }>();

  for (const row of rows) {
    if (row.type !== "question_attempted" || !row.data || typeof row.data !== "object" || Array.isArray(row.data)) continue;
    const data = row.data as Record<string, unknown>;
    const metadata = data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
      ? data.metadata as Record<string, unknown>
      : {};
    if (metadata.correct !== false || metadata.selfAssessment === true) continue;

    const subject = typeof data.subjectId === "string" ? data.subjectId.trim() : "";
    const topic = typeof data.topicId === "string" ? data.topicId.trim() : "";
    const attemptId = typeof data.attemptId === "string" ? data.attemptId.trim() : "";
    if (!subject || !topic || !attemptId) continue;

    const subjectKey = subject.toLocaleLowerCase();
    const topicKey = topic.toLocaleLowerCase();
    const key = `${subjectKey}\u0000${topicKey}`;
    const existing = groups.get(key) ?? {
      subjectKey: subject,
      topicId: topic,
      attemptIds: new Set<string>(),
      incorrectResponses: 0,
      lastObservedAt: null,
    };
    existing.attemptIds.add(attemptId);
    existing.incorrectResponses += 1;

    const occurredAt = typeof data.occurredAt === "string"
      ? data.occurredAt
      : typeof row.created_at === "string" ? row.created_at : null;
    if (occurredAt && Number.isFinite(Date.parse(occurredAt))) {
      if (!existing.lastObservedAt || Date.parse(occurredAt) > Date.parse(existing.lastObservedAt)) {
        existing.lastObservedAt = occurredAt;
      }
    }
    groups.set(key, existing);
  }

  return [...groups.values()]
    .filter((item) => item.attemptIds.size >= 2)
    .map((item) => ({
      subjectKey: item.subjectKey,
      topicId: item.topicId,
      incorrectResponses: item.incorrectResponses,
      distinctAttempts: item.attemptIds.size,
      lastObservedAt: item.lastObservedAt,
      evidenceState: "repeated_topic_errors" as const,
    }))
    .sort((a, b) => b.distinctAttempts - a.distinctAttempts || b.incorrectResponses - a.incorrectResponses);
}

export interface RecurringMistake {
  subjectKey: string;
  topicId: string;
  mistakeId: string;
  incorrectResponses: number;
  distinctAttempts: number;
  lastObservedAt: string | null;
  evidenceState: "recurring_mistake";
}

/** Detects a repeated diagnosed mistake only when its stable ID recurs across attempts. */
export function deriveRecurringMistakes(rows: MistakeEventRecord[]): RecurringMistake[] {
  const groups = new Map<string, {
    subjectKey: string;
    topicId: string;
    mistakeId: string;
    attemptIds: Set<string>;
    incorrectResponses: number;
    lastObservedAt: string | null;
  }>();

  for (const row of rows) {
    if (row.type !== "question_attempted" || !row.data || typeof row.data !== "object" || Array.isArray(row.data)) continue;
    const data = row.data as Record<string, unknown>;
    const metadata = data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
      ? data.metadata as Record<string, unknown>
      : {};
    if (metadata.correct !== false) continue;

    const subject = typeof data.subjectId === "string" ? data.subjectId.trim() : "";
    const topic = typeof data.topicId === "string" ? data.topicId.trim() : "";
    const attemptId = typeof data.attemptId === "string" ? data.attemptId.trim() : "";
    const mistakeId = typeof metadata.mistakeId === "string" ? metadata.mistakeId.trim() : "";
    if (!subject || !topic || !attemptId || !mistakeId) continue;

    const key = `${subject.toLocaleLowerCase()}\u0000${topic.toLocaleLowerCase()}\u0000${mistakeId}`;
    const existing = groups.get(key) ?? {
      subjectKey: subject,
      topicId: topic,
      mistakeId,
      attemptIds: new Set<string>(),
      incorrectResponses: 0,
      lastObservedAt: null,
    };
    existing.attemptIds.add(attemptId);
    existing.incorrectResponses += 1;
    const occurredAt = typeof data.occurredAt === "string"
      ? data.occurredAt
      : typeof row.created_at === "string" ? row.created_at : null;
    if (occurredAt && Number.isFinite(Date.parse(occurredAt))) {
      if (!existing.lastObservedAt || Date.parse(occurredAt) > Date.parse(existing.lastObservedAt)) {
        existing.lastObservedAt = occurredAt;
      }
    }
    groups.set(key, existing);
  }

  return [...groups.values()]
    .filter((item) => item.attemptIds.size >= 2)
    .map((item) => ({
      subjectKey: item.subjectKey,
      topicId: item.topicId,
      mistakeId: item.mistakeId,
      incorrectResponses: item.incorrectResponses,
      distinctAttempts: item.attemptIds.size,
      lastObservedAt: item.lastObservedAt,
      evidenceState: "recurring_mistake" as const,
    }))
    .sort((a, b) => b.distinctAttempts - a.distinctAttempts || b.incorrectResponses - a.incorrectResponses);
}
