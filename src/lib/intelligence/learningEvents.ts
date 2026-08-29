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

function hashString(input: string): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function canonicalEventId(userId: string, source: string, sourceEventId: string): string {
  return `le_${hashString(`${userId}\u0000${source}\u0000${sourceEventId}`)}`;
}

export function normalizeLearningEvent(input: SupportedSourceEvent): EventNormalizationResult {
  const kind = TYPE_MAP[input.type];
  if (!kind) return { status: "unsupported", sourceEventId: input.sourceEventId, source: input.source };

  const sourceEventId = input.sourceEventId.trim();
  const userId = input.userId.trim();
  const source = input.source.trim();
  if (!sourceEventId || !userId || !source) return { status: "unsupported", sourceEventId, source };

  return {
    status: "accepted",
    event: {
      eventId: canonicalEventId(userId, source, sourceEventId),
      userId,
      kind,
      occurredAt: input.occurredAt ?? new Date(0).toISOString(),
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
