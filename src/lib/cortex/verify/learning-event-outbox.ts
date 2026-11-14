type VerifyLearningEvent = {
  sourceEventId: string;
  subjectId: string;
  topicId?: string;
  attemptId: string;
  occurredAt: string;
  metadata: Record<string, string | number | boolean | null>;
};

const KEY_PREFIX = "shadecode:cortex:verify-learning-outbox:v1:";
const MAX_PENDING = 100;

function keyFor(userId: string) {
  return KEY_PREFIX + userId;
}

function read(userId: string): VerifyLearningEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(keyFor(userId)) || "[]");
    return Array.isArray(parsed) ? parsed.filter(item =>
      item && typeof item.sourceEventId === "string" &&
      typeof item.subjectId === "string" && typeof item.attemptId === "string" &&
      typeof item.occurredAt === "string" && item.metadata && typeof item.metadata === "object",
    ).slice(-MAX_PENDING) : [];
  } catch { return []; }
}

function write(userId: string, events: VerifyLearningEvent[]) {
  try { localStorage.setItem(keyFor(userId), JSON.stringify(events.slice(-MAX_PENDING))); } catch {}
}

/** Queue compact, non-content learning evidence. Never stores images or raw answers. */
export function enqueueVerifyLearningEvent(userId: string, event: VerifyLearningEvent) {
  if (typeof window === "undefined" || !userId) return;
  const events = read(userId);
  if (events.some(item => item.sourceEventId === event.sourceEventId)) return;
  write(userId, [...events, event]);
}

/** Deliver events idempotently through the authenticated canonical learning pipeline. */
export async function flushVerifyLearningEvents(userId: string): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine || !userId) return;
  const events = read(userId);
  for (const event of events) {
    try {
      const response = await fetch("/api/intelligence/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "cortex-verify",
          sourceEventId: event.sourceEventId,
          type: "question.attempted",
          subjectId: event.subjectId,
          topicId: event.topicId,
          attemptId: event.attemptId,
          occurredAt: event.occurredAt,
          metadata: event.metadata,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.persisted !== true || payload?.projectionPending === true) continue;
      const remaining = read(userId).filter(item => item.sourceEventId !== event.sourceEventId);
      write(userId, remaining);
    } catch {
      // Keep the event for the next online retry. Do not block marking.
      return;
    }
  }
}
