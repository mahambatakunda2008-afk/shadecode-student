import { CortexEvent, CortexEventInput } from "@/lib/cortex/types";
import { localFirstStore } from "@/lib/local-first/store";

const BROWSER_EVENT = "shadecode:cortex:event";
const DEDUPE_WINDOW_MS = 12_000;
const ENTITY = "cortex_event" as Parameters<typeof localFirstStore.upsert>[0]["entity"];

function isBrowser() { return typeof window !== "undefined"; }
function normalizeData(data?: CortexEvent["data"]) { if (!data) return {}; return Object.keys(data).sort().reduce<Record<string, boolean | number | string | null | undefined>>((acc, key) => { acc[key] = data[key]; return acc; }, {}); }
function buildEventFingerprint(event: CortexEvent) { return JSON.stringify({ userId: event.userId, type: event.type, source: event.source, data: normalizeData(event.data) }); }
function createEventId(input: CortexEventInput) { return input.id ?? `${input.type}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`; }
export function createCortexEvent(input: CortexEventInput): CortexEvent { return { ...input, id: createEventId(input), createdAt: new Date().toISOString() }; }

export function enqueueCortexEvent(input: CortexEventInput) {
  if (!isBrowser()) return;
  const nextEvent = createCortexEvent(input);
  void (async () => {
    const records = await localFirstStore.list(nextEvent.userId).catch(() => []);
    const queued = records.filter((record) => record.entity === ENTITY && !record.deletedAt).map((record) => record.payload as CortexEvent);
    if (queued.some((event) => event.id === nextEvent.id)) return;
    const fingerprint = buildEventFingerprint(nextEvent);
    if (queued.some((event) => Date.now() - new Date(event.createdAt).getTime() < DEDUPE_WINDOW_MS && buildEventFingerprint(event) === fingerprint)) return;
    await localFirstStore.upsert({ id: `cortex-event:${nextEvent.userId}:${nextEvent.id}`, entity: ENTITY, entityId: nextEvent.id, userId: nextEvent.userId, payload: nextEvent });
    window.dispatchEvent(new CustomEvent<CortexEvent>(BROWSER_EVENT, { detail: nextEvent }));
  })();
}

export function getQueuedCortexEvents(userId: string): CortexEvent[] { return []; }
export async function getQueuedCortexEventsAsync(userId: string): Promise<CortexEvent[]> { const records = await localFirstStore.list(userId); return records.filter((record) => record.entity === ENTITY && !record.deletedAt).map((record) => record.payload as CortexEvent); }
export function clearQueuedCortexEvents(userId: string, processedIds?: string[]) { void (async () => { const records = await localFirstStore.list(userId); for (const record of records.filter((r) => r.entity === ENTITY && !r.deletedAt)) { const event = record.payload as CortexEvent; if (!processedIds || processedIds.length === 0 || processedIds.includes(event.id)) await localFirstStore.remove({ id: record.id, entity: ENTITY, userId }); } })(); }
export function subscribeToCortexEvents(userId: string, listener: (event: CortexEvent) => void) { if (!isBrowser()) return () => undefined; const handler = (event: Event) => { const customEvent = event as CustomEvent<CortexEvent>; if (customEvent.detail?.userId === userId) listener(customEvent.detail); }; window.addEventListener(BROWSER_EVENT, handler); return () => window.removeEventListener(BROWSER_EVENT, handler); }
