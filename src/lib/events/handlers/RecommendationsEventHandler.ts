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
      // Invalidate recommendation cache on relevant events
      await this.invalidateRecommendations(event);
    } catch (error) {
      console.error("[RecommendationsEventHandler] Error:", error);
    }
  }

  private async invalidateRecommendations(event: UnifiedEvent): Promise<void> {
    // These events change the student's learning state and can therefore
    // change the next-best action. StudySpace assessment is important because
    // it updates topic mastery before recommendations are consumed.
    const invalidateEvents = [
      "lesson_completed",
      "quiz_completed",
      "exam_completed",
      "study_session_finished",
      "studyspace_assessment_completed",
    ];

    if (invalidateEvents.includes(event.type)) {
      // Invalidate recommendation engine cache
      await recommendationEngine.invalidateCache(event.userId);
      
      // Invalidate intelligence engine cache
      await intelligenceEngine.invalidateCache(event.userId);
      
      console.log(`[Recommendations] Invalidated cache for ${event.type}`);
    }
  }
}
