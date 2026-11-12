export interface RetrievalEventRecord {
  type?: unknown;
  data?: unknown;
  created_at?: unknown;
}

export interface SpacedRetrievalEvidence {
  subjectKey: string;
  topicId: string;
  distinctAttempts: number;
  observedSpanDays: number;
  intervalsDays: number[];
  medianIntervalDays: number;
  lastRetrievedAt: string;
  evidenceState: "observed_spacing";
  interpretation: "descriptive_only";
}

interface AttemptObservation {
  attemptId: string;
  timestamp: number;
}

/**
 * Summarises real retrieval spacing without predicting forgetting or assigning
 * a retention probability. A topic qualifies only with three distinct
 * attempts spanning at least two days. Multiple questions in one attempt are
 * collapsed to one timestamp so they cannot manufacture spacing evidence.
 */
export function deriveSpacedRetrievalEvidence(
  rows: RetrievalEventRecord[],
): SpacedRetrievalEvidence[] {
  const groups = new Map<string, {
    subjectKey: string;
    topicId: string;
    attempts: Map<string, number>;
  }>();

  for (const row of rows) {
    if (row.type !== "question_attempted" || !row.data || typeof row.data !== "object" || Array.isArray(row.data)) continue;
    const data = row.data as Record<string, unknown>;
    const metadata = data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
      ? data.metadata as Record<string, unknown>
      : {};
    if (typeof metadata.correct !== "boolean") continue;

    const subject = typeof data.subjectId === "string" ? data.subjectId.trim() : "";
    const topic = typeof data.topicId === "string" ? data.topicId.trim() : "";
    const attemptId = typeof data.attemptId === "string" ? data.attemptId.trim() : "";
    const timestampValue = typeof data.occurredAt === "string" ? data.occurredAt : row.created_at;
    const timestamp = typeof timestampValue === "string" ? Date.parse(timestampValue) : Number.NaN;
    if (!subject || !topic || !attemptId || !Number.isFinite(timestamp)) continue;

    const subjectKey = subject.toLocaleLowerCase();
    const topicKey = topic.toLocaleLowerCase();
    const key = `${subjectKey}\u0000${topicKey}`;
    const group = groups.get(key) ?? {
      subjectKey: subject,
      topicId: topic,
      attempts: new Map<string, number>(),
    };
    const previous = group.attempts.get(attemptId);
    if (previous === undefined || timestamp > previous) group.attempts.set(attemptId, timestamp);
    groups.set(key, group);
  }

  const dayMs = 24 * 60 * 60 * 1000;
  return [...groups.values()].flatMap((group) => {
    const attempts: AttemptObservation[] = [...group.attempts.entries()]
      .map(([attemptId, timestamp]) => ({ attemptId, timestamp }))
      .sort((a, b) => a.timestamp - b.timestamp);
    if (attempts.length < 3) return [];

    const intervalsDays = attempts.slice(1).map((attempt, index) =>
      Number(((attempt.timestamp - attempts[index].timestamp) / dayMs).toFixed(2)),
    );
    const observedSpanDays = Number(((attempts[attempts.length - 1].timestamp - attempts[0].timestamp) / dayMs).toFixed(2));
    if (observedSpanDays < 2 || intervalsDays.some((interval) => interval <= 0)) return [];

    const sortedIntervals = [...intervalsDays].sort((a, b) => a - b);
    const middle = Math.floor(sortedIntervals.length / 2);
    const medianIntervalDays = sortedIntervals.length % 2
      ? sortedIntervals[middle]
      : Number(((sortedIntervals[middle - 1] + sortedIntervals[middle]) / 2).toFixed(2));

    return [{
      subjectKey: group.subjectKey,
      topicId: group.topicId,
      distinctAttempts: attempts.length,
      observedSpanDays,
      intervalsDays,
      medianIntervalDays,
      lastRetrievedAt: new Date(attempts[attempts.length - 1].timestamp).toISOString(),
      evidenceState: "observed_spacing" as const,
      interpretation: "descriptive_only" as const,
    }];
  }).sort((a, b) => b.distinctAttempts - a.distinctAttempts || b.observedSpanDays - a.observedSpanDays);
}
