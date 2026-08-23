import { CortexEvent, CortexEventInput } from "@/lib/cortex/types";

const STORAGE_KEY = "shadecode:cortex:event-queue";
const BROWSER_EVENT = "shadecode:cortex:event";
const DEDUPE_WINDOW_MS = 12_000;

interface EventQueueState {
  events: CortexEvent[];
}

function isBrowser() {
  return typeof window !== "undefined";
}

function readState(): EventQueueState {
  if (!isBrowser()) {
    return { events: [] };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { events: [] };
    }

    const parsed = JSON.parse(raw) as EventQueueState;
    return { events: Array.isArray(parsed.events) ? parsed.events : [] };
  } catch {
    return { events: [] };
  }
}

function writeState(state: EventQueueState) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeData(data?: CortexEvent["data"]) {
  if (!data) {
    return {};
  }

  return Object.keys(data)
    .sort()
    .reduce<Record<string, boolean | number | string | null | undefined>>((acc, key) => {
      acc[key] = data[key];
      return acc;
    }, {});
}

function buildEventFingerprint(event: CortexEvent) {
  return JSON.stringify({
    userId: event.userId,
    type: event.type,
    source: event.source,
    data: normalizeData(event.data),
  });
}

function createEventId(input: CortexEventInput) {
  return input.id ?? `${input.type}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

export function createCortexEvent(input: CortexEventInput): CortexEvent {
  return {
    ...input,
    id: createEventId(input),
    createdAt: new Date().toISOString(),
  };
}

export function enqueueCortexEvent(input: CortexEventInput) {
  if (!isBrowser()) {
    return;
  }

  const nextEvent = createCortexEvent(input);
  const state = readState();

  const alreadyQueued = state.events.some(
    (event) => event.userId === nextEvent.userId && event.id === nextEvent.id,
  );

  if (alreadyQueued) {
    return;
  }

  const nextFingerprint = buildEventFingerprint(nextEvent);
  const duplicate = state.events.some((event) => {
    const createdAt = new Date(event.createdAt).getTime();
    return (
      event.userId === nextEvent.userId &&
      Date.now() - createdAt < DEDUPE_WINDOW_MS &&
      buildEventFingerprint(event) === nextFingerprint
    );
  });

  if (duplicate) {
    return;
  }

  const nextState = {
    events: [...state.events, nextEvent].slice(-50),
  };

  writeState(nextState);
  window.dispatchEvent(new CustomEvent<CortexEvent>(BROWSER_EVENT, { detail: nextEvent }));
}

export function getQueuedCortexEvents(userId: string) {
  return readState().events.filter((event) => event.userId === userId);
}

export function clearQueuedCortexEvents(userId: string, processedIds?: string[]) {
  const state = readState();
  const remaining = state.events.filter((event) => {
    if (event.userId !== userId) {
      return true;
    }

    if (!processedIds || processedIds.length === 0) {
      return false;
    }

    return !processedIds.includes(event.id);
  });

  writeState({ events: remaining });
}

export function subscribeToCortexEvents(listener: (event: CortexEvent) => void) {
  if (!isBrowser()) {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<CortexEvent>;
    if (customEvent.detail) {
      listener(customEvent.detail);
    }
  };

  window.addEventListener(BROWSER_EVENT, handler);

  return () => {
    window.removeEventListener(BROWSER_EVENT, handler);
  };
}
