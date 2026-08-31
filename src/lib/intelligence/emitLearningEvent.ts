import type { LearningEventKind } from "./learningEvents";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type LearningEventInput = {
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

type QueuedLearningEvent = {
  userId: string;
  input: LearningEventInput;
  attempts: number;
  nextAttemptAt: number;
};

const QUEUE_KEY = "shadecode:cortex:event-queue:v2";
const LEGACY_QUEUE_KEY = "shadecode:cortex:event-queue:v1";
const LAST_USER_KEY = "shadecode:cortex:event-queue:last-user:v1";
const MAX_QUEUE = 200;
const POST_TIMEOUT_MS = 7_000;
const MAX_BACKOFF_MS = 60_000;
let flushing = false;

function readQueue(): QueuedLearningEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is QueuedLearningEvent =>
      !!item && typeof item.userId === "string" && !!item.input && typeof item.input === "object" &&
      typeof item.input.source === "string" && typeof item.input.sourceEventId === "string" &&
      typeof item.input.type === "string" && typeof item.attempts === "number" && typeof item.nextAttemptAt === "number"
    ).slice(-MAX_QUEUE);
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedLearningEvent[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE))); } catch {}
}

async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await createSupabaseBrowserClient().auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

async function migrateLegacyQueue(userId: string | null): Promise<void> {
  if (!userId || typeof window === "undefined" || localStorage.getItem(QUEUE_KEY)) return;
  // v1 records did not carry an owner. Only migrate them when this browser has
  // a recorded last-owner identity, preventing an account switch from inheriting
  // another student's queued events.
  if (localStorage.getItem(LAST_USER_KEY) !== userId) return;
  try {
    const raw = localStorage.getItem(LEGACY_QUEUE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      writeQueue(parsed.filter((item): item is LearningEventInput =>
        !!item && typeof item === "object" && typeof item.source === "string" &&
        typeof item.sourceEventId === "string" && typeof item.type === "string"
      ).map(input => ({ userId, input, attempts: 0, nextAttemptAt: 0 })));
    }
    localStorage.removeItem(LEGACY_QUEUE_KEY);
  } catch {}
}

function enqueue(userId: string, input: LearningEventInput) {
  const queue = readQueue();
  if (queue.some(item => item.userId === userId && item.input.source === input.source && item.input.sourceEventId === input.sourceEventId)) return;
  queue.push({ userId, input, attempts: 0, nextAttemptAt: 0 });
  writeQueue(queue);
  try { localStorage.setItem(LAST_USER_KEY, userId); } catch {}
}

type PostResult = "sent" | "retry" | "drop";

async function post(input: LearningEventInput): Promise<PostResult> {
  try {
    const response = await fetchWithTimeout("/api/intelligence/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
      keepalive: true,
    }, POST_TIMEOUT_MS);
    if (response.ok) return "sent";
    // Invalid/unsupported events must not be retried forever. Auth failures are
    // retained for the owning account because a session may refresh shortly.
    if (response.status >= 400 && response.status < 500 && response.status !== 401) return "drop";
    return "retry";
  } catch {
    return "retry";
  }
}

function backoffMs(attempts: number): number {
  const exponent = Math.min(Math.max(attempts, 0), 6);
  return Math.min(1_000 * 2 ** exponent, MAX_BACKOFF_MS);
}

export async function flushLearningEvents(): Promise<void> {
  if (typeof window === "undefined" || flushing || !navigator.onLine) return;
  flushing = true;
  try {
    const userId = await currentUserId();
    if (!userId) return;
    await migrateLegacyQueue(userId);
    const now = Date.now();
    const queue = readQueue();
    const remaining: QueuedLearningEvent[] = [];

    for (const queued of queue) {
      // Never send one account's offline events while another account is signed in.
      if (queued.userId !== userId || queued.nextAttemptAt > now) {
        remaining.push(queued);
        continue;
      }

      const result = await post(queued.input);
      if (result === "retry") {
        const attempts = queued.attempts + 1;
        remaining.push({ ...queued, attempts, nextAttemptAt: Date.now() + backoffMs(attempts) });
      }
    }
    writeQueue(remaining);
  } finally { flushing = false; }
}

export async function emitLearningEvent(input: LearningEventInput): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const userId = await currentUserId();
  if (!userId) return false;
  try { localStorage.setItem(LAST_USER_KEY, userId); } catch {}
  if (!navigator.onLine) { enqueue(userId, input); return false; }
  const result = await post(input);
  if (result === "retry") enqueue(userId, input);
  else if (result === "sent") void flushLearningEvents();
  return result === "sent";
}

export function installLearningEventSync(): () => void {
  if (typeof window === "undefined") return () => undefined;
  const flush = () => { void flushLearningEvents(); };
  window.addEventListener("online", flush);
  void flushLearningEvents();
  return () => window.removeEventListener("online", flush);
}

export function lessonViewedEvent(lessonId: string, subject?: string, topic?: string) {
  return emitLearningEvent({ source: "learn", sourceEventId: `lesson-view:${lessonId}`, type: "lesson.viewed", subjectId: subject, topicId: topic, entityId: lessonId });
}

export function lessonCompletedEvent(lessonId: string, subject?: string, topic?: string) {
  return emitLearningEvent({ source: "learn", sourceEventId: `lesson-complete:${lessonId}`, type: "lesson.completed", subjectId: subject, topicId: topic, entityId: lessonId });
}

export function examStartedEvent(examId: string, subject?: string, topic?: string) {
  return emitLearningEvent({ source: "exam-sim", sourceEventId: `exam-start:${examId}`, type: "exam.started", subjectId: subject, topicId: topic, entityId: examId, attemptId: examId });
}

export function questionAttemptedEvent(examId: string, questionId: string | number, subject?: string, topic?: string, metadata?: Record<string, string | number | boolean | null>) {
  return emitLearningEvent({ source: "exam-sim", sourceEventId: `question-attempt:${examId}:${questionId}`, type: "question.attempted", subjectId: subject, topicId: topic, entityId: String(questionId), attemptId: examId, metadata });
}

export function examCompletedEvent(examId: string, subject?: string, topic?: string, metadata?: Record<string, string | number | boolean | null>) {
  return emitLearningEvent({ source: "exam-sim", sourceEventId: `exam-complete:${examId}`, type: "exam.completed", subjectId: subject, topicId: topic, entityId: examId, attemptId: examId, metadata });
}

export type { LearningEventKind };
