import { localOperationStore } from "./operation-store";
import { createOperationId } from "./operations";
import { getDeviceId } from "./device";

export type XPEventKind = "task_completed" | "lesson_completed" | "exam_completed" | "challenge_completed" | "manual_adjustment";

export interface XPEvent {
  id: string;
  userId: string;
  kind: XPEventKind;
  amount: number;
  sourceId?: string;
  createdAt: string;
}

const SEQUENCE_KEY = "shadecode:operation-sequence";

async function nextSequence(): Promise<number> {
  if (typeof window === "undefined") return Date.now();
  const next = Number(window.localStorage.getItem(SEQUENCE_KEY) || "0") + 1;
  window.localStorage.setItem(SEQUENCE_KEY, String(next));
  return next;
}

export async function appendXPEvent(event: Omit<XPEvent, "id">): Promise<XPEvent> {
  const deviceId = getDeviceId();
  const sequence = await nextSequence();
  const id = createOperationId(deviceId, sequence);
  const stored: XPEvent = { ...event, id };
  await localOperationStore.append({
    id,
    deviceId,
    userId: event.userId,
    entity: "xp_event",
    entityId: id,
    kind: "create",
    payload: stored,
    timestamp: event.createdAt,
    sequence,
  });
  return stored;
}

export function calculateXP(events: XPEvent[]): number {
  return events.reduce((total, event) => total + event.amount, 0);
}
