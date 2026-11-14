export type InterventionOutcomeState = "collecting_evidence" | "improving" | "stable" | "declining";

export interface VerifyInterventionOutcome {
  interventionId: string;
  subjectKey: string;
  topicId: string;
  curriculumTopicKey: string;
  interventionLevel: "hint" | "method" | "solution";
  state: InterventionOutcomeState;
  baselineAttempts: number;
  transferAttempts: number;
  baselineScore: number | null;
  transferScore: number | null;
  scoreChange: number | null;
  observedAt: string;
  interpretation: "descriptive_not_causal";
}

type EventRow = { type?: unknown; data?: unknown; created_at?: unknown };

type AttemptEvidence = {
  attemptId: string;
  score: number;
  occurredAt: string;
};

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function numericScore(metadata: Record<string, unknown>): number | null {
  const raw = metadata.evidenceScore ?? metadata.percentage;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(0, Math.min(100, raw));
  if (typeof raw === "string" && raw.trim() && Number.isFinite(Number(raw))) {
    return Math.max(0, Math.min(100, Number(raw)));
  }
  if (metadata.correct === true) return 100;
  if (metadata.correct === false) return 0;
  return null;
}

function occurredAt(data: Record<string, unknown>, row: EventRow): string | null {
  const value = typeof data.occurredAt === "string" ? data.occurredAt : row.created_at;
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;
}

function attemptScores(events: Array<{ data: Record<string, unknown>; row: EventRow }>): AttemptEvidence[] {
  const groups = new Map<string, { scores: number[]; occurredAt: string }>();
  for (const { data, row } of events) {
    const attemptId = typeof data.attemptId === "string" ? data.attemptId.trim() : "";
    const metadata = record(data.metadata) ? data.metadata : {};
    const score = numericScore(metadata);
    const time = occurredAt(data, row);
    if (!attemptId || score === null || !time || metadata.selfAssessment === true) continue;
    const group = groups.get(attemptId) ?? { scores: [], occurredAt: time };
    group.scores.push(score);
    if (Date.parse(time) > Date.parse(group.occurredAt)) group.occurredAt = time;
    groups.set(attemptId, group);
  }
  return [...groups.entries()].map(([attemptId, group]) => ({
    attemptId,
    score: group.scores.reduce((sum, value) => sum + value, 0) / group.scores.length,
    occurredAt: group.occurredAt,
  }));
}

/**
 * Describe whether performance changed after a Verify intervention.
 *
 * Requires a verified curriculum topic, two independent baseline attempts in
 * the 30 days before help, and two distinct fresh-transfer attempts. The result is descriptive only:
 * it does not establish that the intervention caused the change.
 */
export function deriveVerifyInterventionOutcomes(rows: EventRow[]): VerifyInterventionOutcome[] {
  const validEvents: Array<{ data: Record<string, unknown>; row: EventRow; metadata: Record<string, unknown> }> = [];
  for (const row of rows) {
    if (row.type !== "question_attempted" || !record(row.data)) continue;
    const data = row.data;
    const metadata = record(data.metadata) ? data.metadata : {};
    if (metadata.selfAssessment === true) continue;
    const subject = typeof data.subjectId === "string" ? data.subjectId.trim() : "";
    const topic = typeof data.topicId === "string" ? data.topicId.trim() : "";
    const topicKey = typeof data.curriculumTopicKey === "string" ? data.curriculumTopicKey.trim() : "";
    const attemptId = typeof data.attemptId === "string" ? data.attemptId.trim() : "";
    const time = occurredAt(data, row);
    if (!subject || !topic || !topicKey || !attemptId || !time || numericScore(metadata) === null) continue;
    validEvents.push({ data, row, metadata });
  }

  const linked = new Map<string, typeof validEvents>();
  for (const event of validEvents) {
    const id = event.metadata.interventionId;
    const level = event.metadata.interventionLevel;
    const elapsed = event.metadata.interventionToAttemptHours;
    if (typeof id !== "string" || !/^vi_[a-z0-9_-]{6,80}$/i.test(id) ||
        (level !== "hint" && level !== "method" && level !== "solution") ||
        typeof elapsed !== "number" || !Number.isFinite(elapsed) || elapsed < 0 || elapsed > 336 ||
        event.metadata.freshTransfer !== true) continue;
    const group = linked.get(id) ?? [];
    group.push(event);
    linked.set(id, group);
  }

  const outcomes: VerifyInterventionOutcome[] = [];
  for (const [interventionId, linkedEvents] of linked) {
    const first = linkedEvents[0];
    const subject = String(first.data.subjectId);
    const topic = String(first.data.topicId);
    const topicKey = String(first.data.curriculumTopicKey);
    const level = first.metadata.interventionLevel as VerifyInterventionOutcome["interventionLevel"];
    // Do not merge links across subjects or curriculum topic identities.
    const sameTopic = linkedEvents.filter(event =>
      event.data.subjectId === subject &&
      event.data.topicId === topic &&
      event.data.curriculumTopicKey === topicKey &&
      event.metadata.interventionLevel === level,
    );
    const inferredInterventionTime = Math.min(...sameTopic.map(event => {
      const time = Date.parse(occurredAt(event.data, event.row)!);
      return time - Number(event.metadata.interventionToAttemptHours) * 3_600_000;
    }));
    if (!Number.isFinite(inferredInterventionTime)) continue;

    const allTopicEvents = validEvents.filter(event =>
      event.data.subjectId === subject &&
      event.data.topicId === topic &&
      event.data.curriculumTopicKey === topicKey,
    );
    const baselineWindowStart = inferredInterventionTime - 30 * 86_400_000;
    const baseline = attemptScores(allTopicEvents.filter(event => {
      const time = Date.parse(occurredAt(event.data, event.row)!);
      return time < inferredInterventionTime && time >= baselineWindowStart;
    }));
    const transfer = attemptScores(sameTopic.filter(event => event.metadata.freshTransfer === true)
      .map(event => ({ data: event.data, row: event.row })));
    const baselineMean = baseline.length ? baseline.reduce((sum, item) => sum + item.score, 0) / baseline.length : null;
    const transferMean = transfer.length ? transfer.reduce((sum, item) => sum + item.score, 0) / transfer.length : null;
    const enoughEvidence = baseline.length >= 2 && transfer.length >= 2;
    const change = enoughEvidence && baselineMean !== null && transferMean !== null
      ? Math.round((transferMean - baselineMean) * 10) / 10
      : null;
    const state: InterventionOutcomeState = change === null
      ? "collecting_evidence"
      : change >= 10 ? "improving" : change <= -10 ? "declining" : "stable";
    const latest = transfer.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))[0];
    outcomes.push({
      interventionId,
      subjectKey: subject,
      topicId: topic,
      curriculumTopicKey: topicKey,
      interventionLevel: level,
      state,
      baselineAttempts: baseline.length,
      transferAttempts: transfer.length,
      baselineScore: baselineMean === null ? null : Math.round(baselineMean * 10) / 10,
      transferScore: transferMean === null ? null : Math.round(transferMean * 10) / 10,
      scoreChange: change,
      observedAt: latest?.occurredAt ?? occurredAt(first.data, first.row)!,
      interpretation: "descriptive_not_causal",
    });
  }
  return outcomes.sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt)).slice(0, 20);
}
