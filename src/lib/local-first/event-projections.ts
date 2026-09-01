import type { CortexEvent } from "@/lib/cortex/types";
import { awardXp, recordStudyDay, unlockAchievement } from "./gamification";

/**
 * Applies reward projections from the canonical learning-event stream.
 * The event remains the source of truth for the offline projection; the
 * server must still validate authoritative rewards during sync.
 */
export async function projectLearningEvent(event: CortexEvent): Promise<void> {
  if (!event.userId) return;

  const data = event.data ?? {};
  const xp = typeof data.xp === "number" ? data.xp : 0;
  if (xp > 0) {
    await awardXp(event.userId, xp, event.id);
  }

  const studyEvents: CortexEvent["type"][] = [
    "lesson_started",
    "lesson_completed",
    "quiz_completed",
    "challenge_completed",
    "exam.completed",
    "exam.marking.completed",
    "study_session_started",
    "study_session_finished",
    "verify.completed",
    "studyspace.assessment.completed",
  ];
  if (studyEvents.includes(event.type)) {
    await recordStudyDay(event.userId, new Date(event.createdAt));
  }

  const achievement = typeof data.achievementId === "string" ? data.achievementId.trim() : "";
  if (achievement) {
    const progress = typeof data.progress === "number" ? data.progress : undefined;
    await unlockAchievement(event.userId, achievement, progress);
  }
}

export async function projectLearningEvents(events: CortexEvent[]): Promise<void> {
  for (const event of events) {
    await projectLearningEvent(event);
  }
}
