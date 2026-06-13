/**
 * /lib/events/index.ts
 *
 * Unified Event Pipeline - Main Entry Point
 */

export { EventPipeline, eventPipeline } from "./EventPipeline";
export * from "./types";
export * from "./emit";
export { CortexEventHandler } from "./handlers/CortexEventHandler";
export { AnalyticsEventHandler } from "./handlers/AnalyticsEventHandler";
export { AchievementsEventHandler } from "./handlers/AchievementsEventHandler";
export { RecommendationsEventHandler } from "./handlers/RecommendationsEventHandler";

import { eventPipeline } from "./EventPipeline";
import { CortexEventHandler } from "./handlers/CortexEventHandler";
import { AnalyticsEventHandler } from "./handlers/AnalyticsEventHandler";
import { AchievementsEventHandler } from "./handlers/AchievementsEventHandler";
import { RecommendationsEventHandler } from "./handlers/RecommendationsEventHandler";
import { EventType } from "./types";

/**
 * Initialize the event pipeline with default handlers
 */
export function initializeEventPipeline(): void {
  const cortexHandler = new CortexEventHandler();
  const analyticsHandler = new AnalyticsEventHandler();
  const achievementsHandler = new AchievementsEventHandler();
  const recommendationsHandler = new RecommendationsEventHandler();

  const eventTypes: EventType[] = [
    "lesson_started",
    "lesson_completed",
    "quiz_completed",
    "exam_completed",
    "challenge_completed",
    "study_session_started",
    "study_session_finished",
  ];

  // Register handlers for all event types
  eventTypes.forEach(eventType => {
    eventPipeline.subscribe(eventType, cortexHandler);
    eventPipeline.subscribe(eventType, analyticsHandler);
    eventPipeline.subscribe(eventType, achievementsHandler);
    eventPipeline.subscribe(eventType, recommendationsHandler);
  });

  console.log("[EventPipeline] Initialized with default handlers");
}
