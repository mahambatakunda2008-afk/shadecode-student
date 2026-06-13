/**
 * /lib/student-intelligence/services/intelligence-integration.ts
 *
 * Integration layer between Student Intelligence and Recommendation Engine
 */

import { progressService } from "./progress";
import { performanceService } from "./performance";
import { activityService } from "./activity";
import { getMemory } from "@/lib/cortex/memory";
import { recommendationEngine, RecommendationEngineInput, GoalInput, CareerInterestInput } from "@/lib/recommendation-engine";
import { Recommendation } from "../types";

/**
 * Convert Student Intelligence data to Recommendation Engine input format
 */
export async function buildRecommendationEngineInput(userId: string): Promise<RecommendationEngineInput> {
  // Get data from all services
  const progress = await progressService.getProgress(userId);
  const performance = await performanceService.getPerformance(userId);
  const activity = await activityService.getActivity(userId);
  const cortexMemory = await getMemory(userId);

  // Build curriculum progress input
  const curriculumProgress = {
    overallCompletion: progress.success && progress.data ? progress.data.overallCompletion : 0,
    curriculum: progress.success && progress.data ? {
      totalLessons: progress.data.curriculum.totalLessons,
      completedLessons: progress.data.curriculum.completedLessons,
      inProgressLessons: progress.data.curriculum.inProgressLessons,
      lockedLessons: progress.data.curriculum.lockedLessons,
      completionPercentage: progress.data.curriculum.completionPercentage,
      weightedCompletion: progress.data.curriculum.weightedCompletion,
      currentLesson: progress.data.curriculum.currentLesson ? { id: progress.data.curriculum.currentLesson, title: "Current Lesson" } : null,
      recommendedNextLesson: progress.data.curriculum.recommendedNextLesson ? { id: progress.data.curriculum.recommendedNextLesson, title: "Next Lesson" } : null,
    } : {
      totalLessons: 0,
      completedLessons: 0,
      inProgressLessons: 0,
      lockedLessons: 0,
      completionPercentage: 0,
      weightedCompletion: 0,
      currentLesson: null,
      recommendedNextLesson: null,
    },
    lessons: progress.success && progress.data ? progress.data.lessons.map(l => ({
      lessonId: l.lessonId,
      lessonTitle: l.lessonTitle,
      subject: l.subject,
      progress: l.progress,
      completed: l.completed,
      lastAttempted: l.lastAttempted,
      timeSpent: l.timeSpent,
      attempts: l.attempts,
    })) : [],
    subjects: progress.success && progress.data ? progress.data.subjects.map(s => ({
      subject: s.subject,
      totalLessons: s.totalLessons,
      completedLessons: s.completedLessons,
      completionPercentage: s.completionPercentage,
      weightedCompletion: s.completionPercentage, // Use completionPercentage as fallback
    })) : [],
  };

  // Build weak areas input
  const weakAreas = cortexMemory.weakTopics?.map((topic, index): any => ({
    topicId: crypto.randomUUID(),
    topic: topic,
    subject: "General", // TODO: Extract subject from topic
    severity: (index < 2 ? "critical" : index < 4 ? "high" : "medium") as "critical" | "high" | "medium" | "low",
    score: 0, // TODO: Get actual score
    lastAssessed: new Date().toISOString(),
    recommendedActions: [
      "Review fundamentals",
      "Practice exercises",
      "Take quiz",
    ],
    estimatedTimeToImprove: 60,
  })) || [];

  // Build exam readiness input
  const examReadiness = {
    subject: "General",
    board: "ZIMSEC",
    level: "O-Level",
    overallScore: performance.success && performance.data ? performance.data.trends.averageScore : 0,
    readinessLevel: "Intermediate" as const,
    predictedGrade: "B",
    confidence: 50,
    timeToExam: 30, // TODO: Get actual time to exam
    topicReadiness: {},
  };

  // Build study activity input
  const studyActivity = {
    sessions: activity.success && activity.data ? activity.data.sessions.map(s => ({
      sessionId: s.sessionId,
      subject: s.subject,
      lessonId: s.lessonId,
      startTime: s.startTime,
      endTime: s.endTime,
      duration: s.duration,
      activities: s.activities.filter(a => a.type !== "challenge").map(a => ({
        ...a,
        type: a.type as "lesson" | "revision" | "quiz" | "exam",
      })),
    })) : [],
    timeSpent: activity.success && activity.data ? activity.data.timeSpent : {},
    patterns: activity.success && activity.data ? {
      mostActiveTime: activity.data.patterns.mostActiveTime,
      mostActiveDay: activity.data.patterns.mostActiveDay,
      averageDailyStudyTime: activity.data.patterns.averageDailyStudyTime,
      studyFrequency: activity.data.patterns.studyFrequency,
      consistencyScore: activity.data.patterns.consistencyScore,
    } : {
      mostActiveTime: "10:00",
      mostActiveDay: "Monday",
      averageDailyStudyTime: 0,
      studyFrequency: 0,
      consistencyScore: 0,
    },
    streak: activity.success && activity.data ? {
      currentStreak: activity.data.streak.currentStreak,
      longestStreak: activity.data.streak.longestStreak,
      lastStudyDate: activity.data.streak.lastStudyDate,
    } : {
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: new Date().toISOString(),
    },
  };

  // Build goals input
  const goals: GoalInput[] = []; // TODO: Get from goals table

  // Build career interests input
  const careerInterests: CareerInterestInput[] = []; // TODO: Get from careers table

  return {
    userId,
    curriculumProgress,
    weakAreas,
    examReadiness,
    studyActivity,
    goals,
    careerInterests,
  };
}

/**
 * Convert Recommendation Engine output to Student Intelligence recommendations
 */
export function convertEngineOutputToRecommendations(engineOutput: any): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Add lesson recommendation
  if (engineOutput.recommendedLesson.lessonId !== "unknown") {
    recommendations.push({
      id: crypto.randomUUID(),
      type: "lesson",
      priority: engineOutput.recommendedLesson.priority,
      title: engineOutput.recommendedLesson.lessonTitle,
      description: engineOutput.recommendedLesson.reason,
      action: "Start lesson",
      estimatedTime: engineOutput.recommendedLesson.estimatedTime,
      reason: engineOutput.recommendedLesson.reason,
      createdAt: new Date().toISOString(),
    });
  }

  // Add revision recommendation
  if (engineOutput.recommendedRevisionTopic.topicId !== "none") {
    recommendations.push({
      id: crypto.randomUUID(),
      type: "revision",
      priority: engineOutput.recommendedRevisionTopic.priority,
      title: engineOutput.recommendedRevisionTopic.topic,
      description: engineOutput.recommendedRevisionTopic.reason,
      action: "Start revision",
      estimatedTime: engineOutput.recommendedRevisionTopic.estimatedTime,
      reason: engineOutput.recommendedRevisionTopic.reason,
      createdAt: new Date().toISOString(),
    });
  }

  // Add exam practice recommendation
  recommendations.push({
    id: crypto.randomUUID(),
    type: "practice",
    priority: engineOutput.recommendedExamPractice.priority,
    title: engineOutput.recommendedExamPractice.topic,
    description: engineOutput.recommendedExamPractice.reason,
    action: "Start practice",
    estimatedTime: engineOutput.recommendedExamPractice.estimatedTime,
    reason: engineOutput.recommendedExamPractice.reason,
    createdAt: new Date().toISOString(),
  });

  // Add study action recommendation
  recommendations.push({
    id: crypto.randomUUID(),
    type: "goal",
    priority: engineOutput.recommendedStudyAction.priority,
    title: engineOutput.recommendedStudyAction.action,
    description: engineOutput.recommendedStudyAction.reason,
    action: engineOutput.recommendedStudyAction.action,
    estimatedTime: engineOutput.recommendedStudyAction.estimatedTime,
    reason: engineOutput.recommendedStudyAction.reason,
    createdAt: new Date().toISOString(),
  });

  // Sort by priority
  recommendations.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return recommendations.slice(0, 5); // Return top 5 recommendations
}

/**
 * Get recommendations using the new Recommendation Engine
 */
export async function getRecommendationsFromEngine(userId: string): Promise<Recommendation[]> {
  try {
    const input = await buildRecommendationEngineInput(userId);
    const output = await recommendationEngine.generateRecommendations(input);
    return convertEngineOutputToRecommendations(output);
  } catch (error) {
    console.error("[IntelligenceIntegration] Error getting recommendations from engine:", error);
    return [];
  }
}
