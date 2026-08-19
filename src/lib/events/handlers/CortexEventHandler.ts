/**
 * /lib/events/handlers/CortexEventHandler.ts
 *
 * Adapter from the unified learning-event pipeline into Cortex.
 *
 * Only semantically supported mappings are forwarded. Unsupported unified
 * events are intentionally ignored rather than mislabeled as a different
 * Cortex event type.
 */

import { UnifiedEvent, EventHandler } from "../types";
import { emitCortexEvent } from "@/lib/cortex/events/emit";
import type { CortexEventInput } from "@/lib/cortex/types";

type SupportedCortexMapping = CortexEventInput | null;

export class CortexEventHandler implements EventHandler {
  priority = 1;

  async handle(event: UnifiedEvent): Promise<void> {
    try {
      const cortexEvent = this.toCortexEvent(event);
      if (!cortexEvent) return;
      emitCortexEvent(cortexEvent);
    } catch (error) {
      console.error("[CortexEventHandler] Error:", error);
    }
  }

  private toCortexEvent(event: UnifiedEvent): SupportedCortexMapping {
    switch (event.type) {
      case "exam_completed":
        return {
          userId: event.userId,
          type: "exam.completed",
          source: "exam",
          data: {
            eventId: event.id,
            examId: event.data.examId,
            subject: event.data.subject,
            score: event.data.score,
            totalMarks: event.data.totalMarks,
            grade: event.data.grade,
            weakAreas: event.data.weakAreas.join(", "),
            strongAreas: event.data.strongAreas.join(", "),
            timeSpent: event.data.timeSpent,
          },
        };

      default:
        // The Cortex event vocabulary does not currently contain equivalent
        // lesson/quiz/challenge/session events. Those events still reach the
        // recommendation and analytics handlers through the unified pipeline.
        return null;
    }
  }
}
