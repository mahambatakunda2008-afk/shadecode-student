/**
 * /lib/events/handlers/RecommendationsEventHandler.ts
 *
 * Event Handler for Recommendations
 */

import { UnifiedEvent, EventHandler } from "../types";
import { recommendationEngine } from "@/lib/recommendation-engine";
import { intelligenceEngine } from "@/lib/student-intelligence/services/intelligence";

export class RecommendationsEventHandler implements EventHandler {
  priority = 4; // Lowest priority - recommendations can be processed last

  async handle(event: UnifiedEvent): Promise<void> {
    try {
      // Invalidate recommendation cache on relevant unified events.
      // StudySpace assessment invalidation is handled at its own submission
      // boundary because it is emitted through the Cortex event pipeline.
      await this.invalidateRecommendations(event);
    } catch (error) {
      console.error("[RecommendationsEventHandler] Error:", error);
    }
  }

  private async invalidateRecommendations(event: UnifiedEvent): Promise<void> {
    const invalidateEvents = [
      "lesson_completed",
      "quiz_completed",
      "exam_completed",
      "study_session_finished",
    ];

    if (invalidateEvents.includes(event.type)) {
      await recommendationEngine.invalidateCache(event.userId);
      await intelligenceEngine.invalidateCache(event.userId);
      console.log(`[Recommendations] Invalidated cache for ${event.type}`);
    }
  }
}
