/**
 * /lib/events/handlers/CortexEventHandler.ts
 *
 * Event Handler for Cortex Intelligence
 */

import { UnifiedEvent, EventHandler } from "../types";
import { emitCortexEvent } from "@/lib/cortex/events/emit";
import { CortexEventInput, CortexEventSource } from "@/lib/cortex/types";

const SOURCE_BY_EVENT: Record<UnifiedEvent["type"], CortexEventSource> = {
  lesson_started: "lesson",
  lesson_completed: "lesson",
  quiz_completed: "quiz",
  exam_completed: "exam",
  challenge_completed: "challenge",
  study_session_started: "study-session",
  study_session_finished: "study-session",
};

function normalizeData(data: Record<string, unknown> | undefined): CortexEventInput["data"] {
  if (!data) {
    return undefined;
  }

  const result: NonNullable<CortexEventInput["data"]> = {};

  for (const key of Object.keys(data)) {
    const value = data[key];

    if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      result[key] = value;
      continue;
    }

    try {
      result[key] = JSON.stringify(value);
    } catch {
      result[key] = String(value);
    }
  }

  return result;
}

export class CortexEventHandler implements EventHandler {
  priority = 1; // High priority - Cortex should process events first

  async handle(event: UnifiedEvent): Promise<void> {
    try {
      await emitCortexEvent(this.toCortexEvent(event));
    } catch (error) {
      console.error("[CortexEventHandler] Error:", error);
    }
  }

  private toCortexEvent(event: UnifiedEvent): CortexEventInput {
    return {
      id: event.id,
      userId: event.userId,
      type: event.type,
      source: SOURCE_BY_EVENT[event.type],
      data: normalizeData(event.data as Record<string, unknown>),
    };
  }
}
