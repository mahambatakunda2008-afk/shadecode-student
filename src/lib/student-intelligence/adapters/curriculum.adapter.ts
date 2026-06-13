/**
 * /lib/student-intelligence/adapters/curriculum.adapter.ts
 *
 * Curriculum system adapter
 */

import { getCurriculumState } from "@/lib/curriculum";
import {
  SystemAdapter,
  StudentProgress,
  StudentPerformance,
  StudentActivity,
  StudentIntelligenceData,
} from "../types";

export class CurriculumAdapter implements SystemAdapter {
  name = "curriculum";

  async initialize(): Promise<void> {
    // Initialize curriculum connection
    // No special initialization needed for now
  }

  async getProgress(userId: string): Promise<Partial<StudentProgress>> {
    try {
      const curriculumState = await getCurriculumState(userId);

      if (!curriculumState) {
        return {};
      }

      return {
        curriculum: {
          totalLessons: curriculumState.allLessons.length,
          completedLessons: curriculumState.completedLessons.length,
          inProgressLessons: curriculumState.allLessons.filter(
            (l) => l.progress > 0 && l.progress < 100
          ).length,
          lockedLessons: curriculumState.lockedLessons.length,
          completionPercentage: curriculumState.completionPercent,
          weightedCompletion: curriculumState.completionPercent,
          currentLesson: curriculumState.currentLesson?.id || null,
          recommendedNextLesson: curriculumState.recommendedNextLesson?.id || null,
        },
        lessons: curriculumState.allLessons.map((lesson) => ({
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          subject: lesson.subject_id,
          progress: lesson.progress || 0,
          completed: (lesson.progress || 0) >= 100,
          lastAttempted: lesson.updated_at || new Date().toISOString(),
          timeSpent: 0,
          attempts: 1,
        })),
        overallCompletion: curriculumState.completionPercent,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error("[CurriculumAdapter] Error getting progress:", error);
      return {};
    }
  }

  async getPerformance(userId: string): Promise<Partial<StudentPerformance>> {
    try {
      // Curriculum system doesn't track performance
      return {};
    } catch (error) {
      console.error("[CurriculumAdapter] Error getting performance:", error);
      return {};
    }
  }

  async getActivity(userId: string): Promise<Partial<StudentActivity>> {
    try {
      // Curriculum system doesn't track activity
      return {};
    } catch (error) {
      console.error("[CurriculumAdapter] Error getting activity:", error);
      return {};
    }
  }

  async getIntelligence(userId: string): Promise<Partial<StudentIntelligenceData>> {
    try {
      // Curriculum system doesn't provide intelligence
      return {};
    } catch (error) {
      console.error("[CurriculumAdapter] Error getting intelligence:", error);
      return {};
    }
  }

  async onEvent(event: any): Promise<void> {
    try {
      // Handle curriculum events
      // For now, no special handling needed
    } catch (error) {
      console.error("[CurriculumAdapter] Error handling event:", error);
    }
  }
}

// Export singleton instance
export const curriculumAdapter = new CurriculumAdapter();
