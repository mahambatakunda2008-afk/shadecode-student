import type { CortexSnapshot } from "@/lib/types";
import { recommendationEngine, RecommendationEngineInput, GoalInput, CareerInterestInput } from "@/lib/recommendation-engine";
import { getCareerMapping, getCareerSubjects } from "@/lib/careers/mapping";

/**
 * Convert CortexSnapshot to RecommendationEngineInput
 * Note: This is a simplified conversion. For full functionality,
 * use the Student Intelligence Layer which provides complete data.
 */
function snapshotToEngineInput(snapshot: CortexSnapshot, userId: string): RecommendationEngineInput {
  const weak = snapshot.weakestSubjects ?? [];
  
  // Build weak areas from weakest subjects
  const weakAreas = weak.map((subject, index) => ({
    topicId: crypto.randomUUID(),
    topic: subject,
    subject: subject,
    severity: (index < 2 ? "critical" : index < 4 ? "high" : "medium") as "critical" | "high" | "medium" | "low",
    score: 0,
    lastAssessed: new Date().toISOString(),
    recommendedActions: [
      "Review fundamentals",
      "Practice exercises",
      "Take quiz",
    ],
    estimatedTimeToImprove: 60,
  }));

  // Build curriculum progress from snapshot
  const completion = (snapshot as any).curriculumCompletionPercent ?? 0;
  const recommended = (snapshot as any).recommendedNextLesson;
  const currentLesson = (snapshot as any).currentLesson;
  const lockedCount = (snapshot as any).lockedLessonCount ?? 0;

  const curriculumProgress = {
    overallCompletion: completion,
    curriculum: {
      totalLessons: 0,
      completedLessons: 0,
      inProgressLessons: 0,
      lockedLessons: lockedCount,
      completionPercentage: completion,
      weightedCompletion: completion,
      currentLesson: currentLesson ? { id: currentLesson.id, title: currentLesson.title } : null,
      recommendedNextLesson: recommended ? { id: recommended.id, title: recommended.title } : null,
    },
    lessons: [],
    subjects: snapshot.subjects?.map(subject => ({
      subject,
      totalLessons: 0,
      completedLessons: 0,
      completionPercentage: 0,
      weightedCompletion: 0,
    })) || [],
  };

  // Build exam readiness (simplified)
  const examReadiness = {
    subject: "General",
    board: "ZIMSEC",
    level: "O-Level",
    overallScore: snapshot.lastExamScore ?? 0,
    readinessLevel: "Intermediate" as const,
    predictedGrade: "B",
    confidence: 50,
    timeToExam: 30,
    topicReadiness: {},
  };

  // Build study activity (simplified)
  const studyActivity = {
    sessions: [],
    timeSpent: {},
    patterns: {
      mostActiveTime: "10:00",
      mostActiveDay: "Monday",
      averageDailyStudyTime: 0,
      studyFrequency: 0,
      consistencyScore: 50,
    },
    streak: {
      currentStreak: snapshot.streak,
      longestStreak: snapshot.streak,
      lastStudyDate: new Date().toISOString(),
    },
  };

  // Build goals (empty for now)
  const goals: GoalInput[] = [];

  // Build career interests from snapshot if available
  const careerInterests: CareerInterestInput[] = [];
  if ((snapshot as any).careerInterests) {
    for (const career of (snapshot as any).careerInterests) {
      const mapping = getCareerMapping(career.id || career);
      if (mapping) {
        careerInterests.push({
          careerId: mapping.careerId,
          careerName: mapping.careerName,
          recommendedSubjects: getCareerSubjects(mapping.careerId),
          recommendedCourses: [],
        });
      }
    }
  }

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

export async function generateStudyPlan(snapshot: CortexSnapshot, userId?: string) {
  // Try to use Recommendation Engine if userId is provided
  if (userId) {
    try {
      const input = snapshotToEngineInput(snapshot, userId);
      const output = await recommendationEngine.generateRecommendations(input);
      
      // Convert engine output to task format
      const tasks: {
        title: string;
        priority: string;
        estimatedMinutes: number;
        lessonId?: string;
      }[] = [];

      // Add lesson recommendation
      if (output.recommendedLesson.lessonId !== "unknown") {
        tasks.push({
          title: output.recommendedLesson.lessonTitle,
          priority: output.recommendedLesson.priority,
          estimatedMinutes: output.recommendedLesson.estimatedTime,
          lessonId: output.recommendedLesson.lessonId,
        });
      }

      // Add revision recommendation
      if (output.recommendedRevisionTopic.topicId !== "none") {
        tasks.push({
          title: `Revise: ${output.recommendedRevisionTopic.topic}`,
          priority: output.recommendedRevisionTopic.priority,
          estimatedMinutes: output.recommendedRevisionTopic.estimatedTime,
        });
      }

      // Add exam practice recommendation
      tasks.push({
        title: `Practice: ${output.recommendedExamPractice.topic}`,
        priority: output.recommendedExamPractice.priority,
        estimatedMinutes: output.recommendedExamPractice.estimatedTime,
      });

      // Add study action recommendation
      tasks.push({
        title: output.recommendedStudyAction.action,
        priority: output.recommendedStudyAction.priority,
        estimatedMinutes: output.recommendedStudyAction.estimatedTime,
      });

      // Sort by priority
      tasks.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
      });

      const weak = snapshot.weakestSubjects ?? [];
      const timetableSuggestion = weak.map((subject, i) => ({
        day: i % 7,
        subject,
        duration: 60,
      }));

      return {
        tasks,
        timetableSuggestion,
        source: "recommendation-engine",
      };
    } catch (error) {
      console.error("[generateStudyPlan] Error using recommendation engine:", error);
      // Fall back to old logic
    }
  }

  // Fallback to old logic (preserved for backward compatibility)
  const weak = snapshot.weakestSubjects ?? [];

  // Base tasks derived from weakest subjects (fallback behavior preserved)
  const tasks: {
    title: string;
    priority: string;
    estimatedMinutes: number;
    lessonId?: string;
  }[] = weak.flatMap((subject) => [
    {
      title: `Revise core concepts in ${subject}`,
      priority: "high",
      estimatedMinutes: 30,
    },
    {
      title: `Practice exam questions in ${subject}`,
      priority: "high",
      estimatedMinutes: 45,
    },
  ]);

  // Curriculum-aware signals (read only if present)
  const completion = (snapshot as any).curriculumCompletionPercent;
  const recommended = (snapshot as any).recommendedNextLesson;
  const currentLesson = (snapshot as any).currentLesson;
  const lockedCount = (snapshot as any).lockedLessonCount ?? 0;

  // 1) Prioritize recommended next lesson when available
  if (recommended) {
    tasks.unshift({
      title: `Continue lesson: ${recommended.title}`,
      priority: "critical",
      estimatedMinutes: 40,
      lessonId: recommended.id,
    });
  } else if (currentLesson) {
    // fallback: focus on current lesson if present
    tasks.unshift({
      title: `Work on current lesson: ${currentLesson.title}`,
      priority: "high",
      estimatedMinutes: 30,
      lessonId: currentLesson.id,
    });
  }

  // 2) Adapt plan based on completion percent
  if (typeof completion === "number") {
    if (completion < 50) {
      // Low completion → progression-focused
      tasks.push({
        title: "Progress through next unlocked lessons to build momentum",
        priority: "high",
        estimatedMinutes: 60,
      });
    } else if (completion >= 80) {
      // Near completion → mastery and revision
      tasks.push(
        {
          title: "Deep revision: consolidate recent lessons",
          priority: "high",
          estimatedMinutes: 50,
        },
        {
          title: "Mastery exercise: cumulative practice test",
          priority: "high",
          estimatedMinutes: 60,
        }
      );
    } else {
      // Mid-range → balanced approach
      tasks.push({
        title: "Balanced practice and progression",
        priority: "medium",
        estimatedMinutes: 45,
      });
    }
  }

  // 3) If many lessons are locked, recommend prerequisite completion
  if (lockedCount > 3) {
    tasks.unshift({
      title: "Complete prerequisite lessons to unlock more content",
      priority: "high",
      estimatedMinutes: 45,
    });
  }

  const timetableSuggestion = weak.map((subject, i) => ({
    day: i % 7,
    subject,
    duration: 60,
  }));

  return {
    tasks,
    timetableSuggestion,
    source: "legacy",
  };
}
