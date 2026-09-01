import type { LearningEventKind } from "./learningEvents";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { getRememberedUserId } from "@/lib/local-first/identity";

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

type QueuedLearningEvent = { ownerId: string; input: LearningEventInput };

const QUEUE_KEY = "shadecode:cortex:event-queue:v2";
const MAX_QUEUE = 200;
const POST_TIMEOUT_MS = 7_000;
let flushing = false;

function readQueue(): QueuedLearningEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is QueuedLearningEvent => Boolean(item?.ownerId && item?.input?.sourceEventId));
  } catch { return []; }
}

function writeQueue(queue: QueuedLearningEvent[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE))); } catch {}
}

function enqueue(input: LearningEventInput, ownerId: string) {
  const queue = readQueue();
  if (queue.some(item => item.ownerId === ownerId && item.input.source === input.source && item.input.sourceEventId === input.sourceEventId)) return;
  queue.push({ ownerId, input });
  writeQueue(queue);
}

async function post(input: LearningEventInput): Promise<boolean> {
  try {
    const response = await fetchWithTimeout("/api/intelligence/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
      keepalive: true,
    }, POST_TIMEOUT_MS);
    return response.ok;
  } catch { return false; }
}

export async function flushLearningEvents(): Promise<void> {
  if (typeof window === "undefined" || flushing || !navigator.onLine) return;
  const activeUserId = getRememberedUserId();
  if (!activeUserId) return;
  flushing = true;
  try {
    const queue = readQueue();
    const remaining: QueuedLearningEvent[] = [];
    for (const queued of queue) {
      if (queued.ownerId !== activeUserId) {
        remaining.push(queued);
        continue;
      }
      if (!(await post(queued.input))) remaining.push(queued);
    }
    writeQueue(remaining);
  } finally { flushing = false; }
}

export async function emitLearningEvent(input: LearningEventInput): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const ownerId = getRememberedUserId();
  if (!navigator.onLine) {
    if (ownerId) enqueue(input, ownerId);
    return false;
  }
  const sent = await post(input);
  if (!sent && ownerId) enqueue(input, ownerId);
  else if (sent) void flushLearningEvents();
  return sent;
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
