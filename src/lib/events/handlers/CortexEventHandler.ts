/**
 * /lib/events/handlers/CortexEventHandler.ts
 *
 * Event Handler for Cortex Intelligence
 */

import { UnifiedEvent, EventHandler } from "../types";
import { emitCortexEvent } from "@/lib/cortex/events/emit";

export class CortexEventHandler implements EventHandler {
  priority = 1; // High priority - Cortex should process events first

  async handle(event: UnifiedEvent): Promise<void> {
    try {
      // Map unified event to Cortex event format
      const cortexEvent = this.toCortexEvent(event);
      
      // Emit to Cortex
      await emitCortexEvent(cortexEvent);
    } catch (error) {
      console.error("[CortexEventHandler] Error:", error);
    }
  }

  private toCortexEvent(event: UnifiedEvent): any {
    const baseEvent = {
      userId: event.userId,
      type: event.type,
      source: event.source,
      timestamp: event.timestamp,
      data: event.data,
    };

    return baseEvent;
  }
}
