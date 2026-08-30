export type LearningEventKind =
  | "lesson_viewed"
  | "lesson_completed"
  | "question_attempted"
  | "quiz_completed"
  | "exam_started"
  | "exam_completed"
  | "project_evidence_added"
  | "project_stage_completed"
  | "mistake_reviewed"
  | "task_completed";

export type LearningEvent = {
  eventId: string;
  userId: string;
  kind: LearningEventKind;
  occurredAt: string;
  source: string;
  sourceEventId: string;
  subjectId?: string;
  topicId?: string;
  entityId?: string;
  attemptId?: string;
  metadata: Record<string, string | number | boolean | null>;
};

export type EventNormalizationResult =
  | { status: "accepted"; event: LearningEvent }
  | { status: "unsupported"; sourceEventId: string; source: string };

export type SupportedSourceEvent = {
  userId: string;
  source: string;
  sourceEventId: string;
  type: string;
  occurredAt?: string;
  subjectId?: string;
  topicId?: string;
  entityId?: string;
  attemptId?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

const TYPE_MAP: Record<string, LearningEventKind> = {
  "lesson.viewed": "lesson_viewed",
  "lesson.completed": "lesson_completed",
  "question.attempted": "question_attempted",
  "quiz.completed": "quiz_completed",
  "exam.started": "exam_started",
  "exam.completed": "exam_completed",
  "project.evidence_added": "project_evidence_added",
  "project.stage_completed": "project_stage_completed",
  "mistake.reviewed": "mistake_reviewed",
  "task.completed": "task_completed",
};

/**
 * Stable 128-bit FNV-1a-style identity represented as two independent 64-bit lanes.
 * This is an identifier, not a security primitive. Database uniqueness remains the
 * final collision guard because canonical event IDs are also stored server-side.
 */
function hashLane(input: string, seed: bigint): bigint {
  let hash = seed;
  const prime = 1099511628211n;
  const mask = 0xffffffffffffffffn;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= BigInt(input.charCodeAt(index));
    hash = (hash * prime) & mask;
  }
  return hash;
}

function toHex(value: bigint): string {
  return value.toString(16).padStart(16, "0");
}

export function canonicalEventId(userId: string, source: string, sourceEventId: string): string {
  const input = `${userId}\u0000${source}\u0000${sourceEventId}`;
  const first = hashLane(input, 14695981039346656037n);
  const second = hashLane(`shadecode:event:${input}`, 1099511628211n);
  return `le_${toHex(first)}${toHex(second)}`;
}

export function normalizeLearningEvent(input: SupportedSourceEvent): EventNormalizationResult {
  const kind = TYPE_MAP[input.type];
  if (!kind) return { status: "unsupported", sourceEventId: input.sourceEventId, source: input.source };

  const sourceEventId = input.sourceEventId.trim();
  const userId = input.userId.trim();
  const source = input.source.trim();
  if (!sourceEventId || !userId || !source) return { status: "unsupported", sourceEventId, source };

  const occurredAt = input.occurredAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(occurredAt))) {
    return { status: "unsupported", sourceEventId, source };
  }

  return {
    status: "accepted",
    event: {
      eventId: canonicalEventId(userId, source, sourceEventId),
      userId,
      kind,
      occurredAt,
      source,
      sourceEventId,
      subjectId: input.subjectId,
      topicId: input.topicId,
      entityId: input.entityId,
      attemptId: input.attemptId,
      metadata: { ...(input.metadata ?? {}) },
    },
  };
}

/** In-memory idempotency guard for deterministic processing and tests. Persist the key server-side for production replay protection. */
export class LearningEventInbox {
  private readonly accepted = new Set<string>();

  accept(event: LearningEvent): boolean {
    if (this.accepted.has(event.eventId)) return false;
    this.accepted.add(event.eventId);
    return true;
  }

  has(eventId: string): boolean {
    return this.accepted.has(eventId);
  }
}