const SESSION_KEY = "shadecode_session_id";
const ANON_KEY = "shadecode_anonymous_id";
const QUEUE_KEY = "shadecode:traction:event-queue:v1";
const MAX_QUEUE = 500;
const POST_TIMEOUT_MS = 7000;
let flushing = false;

type QueuedEvent = {
  clientEventId: string;
  name: string;
  path: string | null;
  sessionId?: string;
  anonymousId?: string;
  properties: Record<string, unknown>;
};

function stableId(key: string) {
  if (typeof window === "undefined") return undefined;
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const value = crypto.randomUUID();
    window.localStorage.setItem(key, value);
    return value;
  } catch {
    return undefined;
  }
}

function readQueue(): QueuedEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(QUEUE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is QueuedEvent =>
      typeof item?.clientEventId === "string" &&
      typeof item?.name === "string" &&
      typeof item?.properties === "object" &&
      item.properties !== null,
    );
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedEvent[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
  } catch {
    // Analytics must never break the learning experience.
  }
}

function enqueue(event: QueuedEvent) {
  const queue = readQueue();
  if (queue.some((item) => item.clientEventId === event.clientEventId)) return;
  queue.push(event);
  writeQueue(queue);
}

async function postEvent(event: QueuedEvent): Promise<boolean> {
  try {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : undefined;
    const timeout = controller ? setTimeout(() => controller.abort(), POST_TIMEOUT_MS) : undefined;
    try {
      const response = await fetch("/api/traction/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        credentials: "include",
        signal: controller?.signal,
        body: JSON.stringify(event),
      });
      return response.ok;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  } catch {
    return false;
  }
}

export async function flushQueuedEvents(): Promise<void> {
  if (typeof window === "undefined" || flushing || !navigator.onLine) return;
  flushing = true;
  try {
    const queue = readQueue();
    const remaining: QueuedEvent[] = [];
    for (const event of queue) {
      if (!(await postEvent(event))) remaining.push(event);
    }
    writeQueue(remaining);
  } finally {
    flushing = false;
  }
}

export async function trackEvent(
  name: string,
  properties: Record<string, unknown> = {},
) {
  if (typeof window === "undefined") return;

  const event: QueuedEvent = {
    clientEventId: crypto.randomUUID(),
    name,
    path: window.location.pathname,
    sessionId: stableId(SESSION_KEY),
    anonymousId: stableId(ANON_KEY),
    properties,
  };

  if (!navigator.onLine) {
    enqueue(event);
    return;
  }

  const sent = await postEvent(event);
  if (!sent) enqueue(event);
  else void flushQueuedEvents();
}

export function trackPageView() {
  return trackEvent("page_view");
}

export function installTractionSync(): () => void {
  if (typeof window === "undefined") return () => undefined;
  const flush = () => { void flushQueuedEvents(); };
  window.addEventListener("online", flush);
  void flushQueuedEvents();
  return () => window.removeEventListener("online", flush);
}
