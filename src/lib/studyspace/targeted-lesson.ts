import type { ProfileRecommendation } from "./profile-adaptive";
import { generateLesson, type GeneratedLesson } from "@/lib/cortex/lessonGenerator";

export type TargetedLessonRequest = {
  subject: string;
  topic: string;
  userId: string;
  reason: string;
};

export function targetedLessonRequest(
  recommendation: ProfileRecommendation,
  userId: string,
): TargetedLessonRequest | null {
  if (recommendation.action !== "lesson" || !recommendation.subject || !recommendation.topic) return null;
  return {
    subject: recommendation.subject,
    topic: recommendation.topic,
    userId,
    reason: recommendation.reason,
  };
}

export async function generateTargetedLesson(
  recommendation: ProfileRecommendation,
  userId: string,
): Promise<GeneratedLesson | null> {
  const request = targetedLessonRequest(recommendation, userId);
  if (!request) return null;
  return generateLesson(request.subject, request.topic, request.userId);
}
