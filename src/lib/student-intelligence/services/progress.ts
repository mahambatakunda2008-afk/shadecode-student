/**
 * /lib/student-intelligence/services/progress.ts
 *
 * Progress aggregation service
 */

import { createClient } from "@/lib/supabase/client";
import { computeCurriculumState, getCurriculumState } from "@/lib/curriculum";
import { getMemory } from "@/lib/cortex/memory";
import {
  StudentProgress,
  CurriculumProgress,
  LessonProgress,
  SubjectProgress,
  ServiceResponse,
} from "../types";

const CACHE_TTL = 300; // 5 minutes

export class ProgressService {
  private cache: Map<string, { data: StudentProgress; expiresAt: number }> = new Map();

  /**
   * Get complete progress data for a user
   */
  async getProgress(userId: string): Promise<ServiceResponse<StudentProgress>> {
    try {
      // Check cache
      const cached = this.getFromCache(userId);
      if (cached) {
        return {
          success: true,
          data: cached,
          cached: true,
          timestamp: new Date().toISOString(),
        };
      }

      // Aggregate progress from multiple sources
      const curriculumProgress = await this.getCurriculumProgress(userId);
      const lessonProgress = await this.getLessonProgress(userId);
      const subjectProgress = await this.getSubjectProgress(userId, lessonProgress);
      const overallCompletion = this.calculateOverallCompletion(lessonProgress);

      const progress: StudentProgress = {
        curriculum: curriculumProgress,
        lessons: lessonProgress,
        subjects: subjectProgress,
        overallCompletion,
        lastUpdated: new Date().toISOString(),
      };

      // Cache the result
      this.setCache(userId, progress);

      return {
        success: true,
        data: progress,
        cached: false,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("[ProgressService] Error getting progress:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        cached: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get curriculum progress
   */
  async getCurriculumProgress(userId: string): Promise<CurriculumProgress> {
    try {
      // Get curriculum state from existing curriculum module
      const curriculumState = await getCurriculumState(userId);
      
      if (!curriculumState) {
        return this.getEmptyCurriculumProgress();
      }

      const lessonProgress = await this.getLessonProgress(userId);
      return {
        totalLessons: curriculumState.allLessons.length,
        completedLessons: curriculumState.completedLessons.length,
        inProgressLessons: curriculumState.allLessons.filter(
          (l) => l.progress > 0 && l.progress < 100
        ).length,
        lockedLessons: curriculumState.lockedLessons.length,
        completionPercentage: curriculumState.completionPercent,
        weightedCompletion: this.calculateWeightedCompletion(lessonProgress),
        currentLesson: curriculumState.currentLesson?.id || null,
        recommendedNextLesson: curriculumState.recommendedNextLesson?.id || null,
      };
    } catch (error) {
      console.error("[ProgressService] Error getting curriculum progress:", error);
      return this.getEmptyCurriculumProgress();
    }
  }

  /**
   * Get lesson progress for all lessons
   */
  async getLessonProgress(userId: string, lessonId?: string): Promise<LessonProgress[]> {
    try {
      const supabase = createClient();

      let query = supabase
        .from("learn_lessons")
        .select("id, title, subject_id, progress, updated_at, time_spent, attempts")
        .eq("user_id", userId);

      if (lessonId) {
        query = query.eq("id", lessonId);
      }

      const { data: lessons, error } = await query;

      if (error) {
        console.error("[ProgressService] Error getting lessons:", error);
        return [];
      }

      return (lessons || []).map((lesson) => ({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        subject: lesson.subject_id,
        progress: lesson.progress || 0,
        completed: (lesson.progress || 0) >= 100,
        lastAttempted: lesson.updated_at || new Date().toISOString(),
        timeSpent: lesson.time_spent || 0,
        attempts: lesson.attempts || 1,
      }));
    } catch (error) {
      console.error("[ProgressService] Error getting lesson progress:", error);
      return [];
    }
  }

  /**
   * Get subject progress
   */
  async getSubjectProgress(
    userId: string,
    lessonProgress: LessonProgress[]
  ): Promise<SubjectProgress[]> {
    try {
      // Group lessons by subject
      const subjectMap = new Map<string, LessonProgress[]>();

      lessonProgress.forEach((lesson) => {
        if (!subjectMap.has(lesson.subject)) {
          subjectMap.set(lesson.subject, []);
        }
        subjectMap.get(lesson.subject)!.push(lesson);
      });

      // Calculate progress for each subject
      const subjectProgress: SubjectProgress[] = [];

      subjectMap.forEach((lessons, subject) => {
        const totalLessons = lessons.length;
        const completedLessons = lessons.filter((l) => l.completed).length;
        const completionPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
        const averageScore = this.calculateAverageScore(lessons);
        const timeSpent = lessons.reduce((sum, l) => sum + l.timeSpent, 0);

        subjectProgress.push({
          subject,
          totalLessons,
          completedLessons,
          completionPercentage,
          averageScore,
          timeSpent,
        });
      });

      return subjectProgress;
    } catch (error) {
      console.error("[ProgressService] Error getting subject progress:", error);
      return [];
    }
  }

  /**
   * Update progress for a lesson
   */
  async updateProgress(userId: string, progress: Partial<LessonProgress>): Promise<void> {
    try {
      const supabase = createClient();

      if (progress.lessonId && progress.progress !== undefined) {
        const { error } = await supabase
          .from("learn_lessons")
          .update({
            progress: progress.progress,
            updated_at: new Date().toISOString(),
            ...(progress.timeSpent !== undefined && { time_spent: progress.timeSpent }),
            ...(progress.attempts !== undefined && { attempts: progress.attempts }),
          })
          .eq("user_id", userId)
          .eq("id", progress.lessonId);

        if (error) {
          console.error("[ProgressService] Error updating progress:", error);
          throw error;
        }

        // Invalidate cache
        this.invalidateCache(userId);
      }
    } catch (error) {
      console.error("[ProgressService] Error updating progress:", error);
      throw error;
    }
  }

  /**
   * Invalidate cache for a user
   */
  async invalidateCache(userId: string): Promise<void> {
    this.cache.delete(userId);
  }

  /**
   * Calculate overall completion percentage
   */
  private calculateOverallCompletion(lessonProgress: LessonProgress[]): number {
    if (lessonProgress.length === 0) return 0;
    const totalProgress = lessonProgress.reduce((sum, lesson) => sum + lesson.progress, 0);
    return Math.round(totalProgress / lessonProgress.length);
  }

  /**
   * Calculate weighted completion percentage
   */
  private calculateWeightedCompletion(lessonProgress: LessonProgress[]): number {
    if (lessonProgress.length === 0) return 0;
    // Example weighting: give higher weight to lessons with higher progress
    const totalWeight = lessonProgress.reduce((sum, l) => sum + (l.progress / 100), 0);
    const weightedSum = lessonProgress.reduce((sum, l) => sum + l.progress * (l.progress / 100), 0);
    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Calculate average score for lessons
   */
  private calculateAverageScore(lessons: LessonProgress[]): number {
    if (lessons.length === 0) return 0;

    // TODO: Implement actual score tracking
    // For now, use progress as a proxy for score
    const totalScore = lessons.reduce((sum, lesson) => sum + lesson.progress, 0);
    return Math.round(totalScore / lessons.length);
  }

  /**
   * Get empty curriculum progress
   */
  private getEmptyCurriculumProgress(): CurriculumProgress {
    return {
      totalLessons: 0,
      completedLessons: 0,
      inProgressLessons: 0,
      lockedLessons: 0,
      completionPercentage: 0,
      weightedCompletion: 0,
      currentLesson: null,
      recommendedNextLesson: null,
    };
  }

  /**
   * Get from cache
   */
  private getFromCache(userId: string): StudentProgress | null {
    const cached = this.cache.get(userId);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(userId);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cache
   */
  private setCache(userId: string, data: StudentProgress): void {
    this.cache.set(userId, {
      data,
      expiresAt: Date.now() + CACHE_TTL * 1000,
    });
  }
}

// Export singleton instance
export const progressService = new ProgressService();
