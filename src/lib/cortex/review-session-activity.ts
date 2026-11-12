export interface ReviewSessionEventRecord {
  type?: unknown;
  data?: unknown;
  created_at?: unknown;
}

export interface ReviewSessionActivity {
  reviewSessionId: string;
  subjectKey: string;
  topicId: string;
  answeredQuestionCount: number;
  state: "practised" | "completed";
  completionKind: "quiz" | "exam" | "practical" | null;
  lastObservedAt: string | null;
}

/**
 * Reports only attributable review activity. A suggestion click is not practice:
 * at least one answered question is required. A completed quiz event upgrades
 * the session to completed; aggregate completion never counts as a question.
 */
export function deriveReviewSessionActivity(rows: ReviewSessionEventRecord[]): ReviewSessionActivity[] {
  const groups = new Map<string, {
    reviewSessionId: string;
    subjectKey: string;
    topicId: string;
    questionIds: Set<string>;
    completed: boolean;
    completionKind: "quiz" | "exam" | "practical" | null;
    lastObservedAt: string | null;
  }>();

  for (const row of rows) {
    if (row.type !== "question_attempted" && row.type !== "quiz_completed" && row.type !== "exam_completed" && row.type !== "activity_completed") continue;
    if (!row.data || typeof row.data !== "object" || Array.isArray(row.data)) continue;
    const data = row.data as Record<string, unknown>;
    const metadata = data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
      ? data.metadata as Record<string, unknown>
      : {};
    const reviewSessionId = typeof metadata.reviewSessionId === "string" ? metadata.reviewSessionId.trim() : "";
    if (!reviewSessionId || metadata.reviewSource !== "cortex_suggestion") continue;
    const subjectKey = typeof data.subjectId === "string" ? data.subjectId.trim().toLocaleLowerCase() : "";
    const topicId = typeof data.topicId === "string" ? data.topicId.trim().toLocaleLowerCase() : "";
    if (!subjectKey || !topicId) continue;

    const existing = groups.get(reviewSessionId) ?? {
      reviewSessionId,
      subjectKey,
      topicId,
      questionIds: new Set<string>(),
      completed: false,
      completionKind: null,
      lastObservedAt: null,
    };
    if (existing.subjectKey !== subjectKey || existing.topicId !== topicId) continue;

    if (row.type === "question_attempted") {
      if (typeof data.entityId === "string" || typeof data.entityId === "number") {
        existing.questionIds.add(String(data.entityId));
      }
    } else {
      existing.completed = true;
      existing.completionKind = row.type === "quiz_completed" ? "quiz" : row.type === "exam_completed" ? "exam" : "practical";
    }

    const timestamp = typeof data.occurredAt === "string" ? data.occurredAt
      : typeof row.created_at === "string" ? row.created_at : null;
    if (timestamp && Number.isFinite(Date.parse(timestamp)) &&
      (!existing.lastObservedAt || Date.parse(timestamp) > Date.parse(existing.lastObservedAt))) {
      existing.lastObservedAt = timestamp;
    }
    groups.set(reviewSessionId, existing);
  }

  return [...groups.values()]
    .filter((item) => item.questionIds.size > 0)
    .map((item) => ({
      reviewSessionId: item.reviewSessionId,
      subjectKey: item.subjectKey,
      topicId: item.topicId,
      answeredQuestionCount: item.questionIds.size,
      state: item.completed ? "completed" as const : "practised" as const,
      completionKind: item.completionKind,
      lastObservedAt: item.lastObservedAt,
    }))
    .sort((a, b) => (b.lastObservedAt ? Date.parse(b.lastObservedAt) : 0) - (a.lastObservedAt ? Date.parse(a.lastObservedAt) : 0));
}
