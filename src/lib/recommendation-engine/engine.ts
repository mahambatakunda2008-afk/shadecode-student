/**
 * /lib/recommendation-engine/engine.ts
 *
 * Recommendation Engine - Main Engine
 */

import {
  RecommendationEngineInput,
  RecommendationEngineOutput,
  RecommendedLesson,
  RecommendedRevisionTopic,
  RecommendedExamPractice,
  RecommendedStudyAction,
  RecommendationMetadata,
  PriorityScore,
  PriorityFactor,
  RecommendationContext,
  WeakAreaInput,
} from "./types";
import { getSubjectPriority, getMaxSubjectPriority } from "@/lib/careers/mapping";

const CACHE_TTL = 600; // 10 minutes

export class RecommendationEngine {
  private cache: Map<string, { data: RecommendationEngineOutput; expiresAt: number }> = new Map();

  /**
   * Generate recommendations based on input data
   */
  async generateRecommendations(input: RecommendationEngineInput): Promise<RecommendationEngineOutput> {
    try {
      // Check cache
      const cacheKey = this.getCacheKey(input);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Build context
      const context = this.buildContext(input);

      // Calculate priorities
      const priorities = this.calculatePriorities(input, context);

      // Generate recommendations
      const recommendedLesson = this.generateRecommendedLesson(input, context, priorities);
      const recommendedRevisionTopic = this.generateRecommendedRevisionTopic(input, context, priorities);
      const recommendedExamPractice = this.generateRecommendedExamPractice(input, context, priorities);
      const recommendedStudyAction = this.generateRecommendedStudyAction(input, context, priorities);

      // Build metadata
      const metadata = this.buildMetadata(input, context, priorities);

      const output: RecommendationEngineOutput = {
        recommendedLesson,
        recommendedRevisionTopic,
        recommendedExamPractice,
        recommendedStudyAction,
        metadata,
      };

      // Cache the result
      this.setCache(cacheKey, output);

      return output;
    } catch (error) {
      console.error("[RecommendationEngine] Error generating recommendations:", error);
      throw error;
    }
  }

  /**
   * Invalidate cache for a user
   */
  async invalidateCache(userId: string): Promise<void> {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.startsWith(`usil:${userId}:`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Build context from input
   */
  private buildContext(input: RecommendationEngineInput): RecommendationContext {
    return {
      timeToExam: input.examReadiness.timeToExam,
      overallCompletion: input.curriculumProgress.overallCompletion,
      currentStreak: input.studyActivity.streak.currentStreak,
      consistencyScore: input.studyActivity.patterns.consistencyScore,
      weakAreaCount: input.weakAreas.length,
      goalCount: input.goals.length,
      careerInterestCount: input.careerInterests.length,
    };
  }

  /**
   * Calculate priorities for all items
   */
  private calculatePriorities(input: RecommendationEngineInput, context: RecommendationContext): PriorityScore[] {
    const priorities: PriorityScore[] = [];

    // Calculate lesson priorities
    input.curriculumProgress.lessons.forEach(lesson => {
      const score = this.calculateLessonPriority(lesson, input, context);
      priorities.push({
        topicId: lesson.lessonId,
        lessonId: lesson.lessonId,
        subject: lesson.subject,
        score,
        factors: this.getLessonPriorityFactors(lesson, input, context),
      });
    });

    // Calculate weak area priorities
    input.weakAreas.forEach(weakArea => {
      const score = this.calculateWeakAreaPriority(weakArea, input, context);
      priorities.push({
        topicId: weakArea.topicId,
        subject: weakArea.subject,
        score,
        factors: this.getWeakAreaPriorityFactors(weakArea, input, context),
      });
    });

    // Sort by score (highest first)
    priorities.sort((a, b) => b.score - a.score);

    return priorities;
  }

  /**
   * Calculate lesson priority
   */
  private calculateLessonPriority(lesson: any, input: RecommendationEngineInput, context: RecommendationContext): number {
    let score = 0;

    // Base score from curriculum recommendation
    if (input.curriculumProgress.curriculum.recommendedNextLesson?.id === lesson.lessonId) {
      score += 50;
    }

    // Current lesson gets priority
    if (input.curriculumProgress.curriculum.currentLesson?.id === lesson.lessonId) {
      score += 40;
    }

    // In-progress lessons get priority
    if (lesson.progress > 0 && lesson.progress < 100) {
      score += 30;
    }

    // Career-aligned lessons get priority (enhanced with mapping)
    const careerIds = input.careerInterests.map(c => c.careerId);
    if (careerIds.length > 0) {
      const careerPriority = getMaxSubjectPriority(careerIds, lesson.subject);
      score += careerPriority * 2; // Scale priority (1-10) to (2-20)
    }

    // Weak subject lessons get priority
    const weakSubjects = input.weakAreas.map(w => w.subject);
    if (weakSubjects.includes(lesson.subject)) {
      score += 25;
    }

    // Low completion gets priority
    if (context.overallCompletion < 50) {
      score += 15;
    }

    // Consistent study gets priority
    if (context.consistencyScore > 70) {
      score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Calculate weak area priority
   */
  private calculateWeakAreaPriority(weakArea: WeakAreaInput, input: RecommendationEngineInput, context: RecommendationContext): number {
    let score = 0;

    // Base score from severity
    const severityScore: Record<string, number> = { critical: 50, high: 40, medium: 30, low: 20 };
    score += severityScore[weakArea.severity] || 20;

    // Low score gets higher priority
    score += (100 - weakArea.score) * 0.3;

    // Time to exam adjustment
    if (context.timeToExam < 30) {
      score += 20;
    } else if (context.timeToExam < 60) {
      score += 10;
    }

    // Career-aligned weak areas get priority (enhanced with mapping)
    const careerIds = input.careerInterests.map(c => c.careerId);
    if (careerIds.length > 0) {
      const careerPriority = getMaxSubjectPriority(careerIds, weakArea.subject);
      score += careerPriority * 1.5; // Scale priority (1-10) to (1.5-15)
    }

    // High exam frequency topics get priority
    // This would need topic data, for now we use severity

    return Math.min(100, score);
  }

  /**
   * Get lesson priority factors
   */
  private getLessonPriorityFactors(lesson: any, input: RecommendationEngineInput, context: RecommendationContext): PriorityFactor[] {
    const factors: PriorityFactor[] = [];

    if (input.curriculumProgress.curriculum.recommendedNextLesson?.id === lesson.lessonId) {
      factors.push({ factor: "curriculum_recommended", weight: 50, value: 1 });
    }

    if (input.curriculumProgress.curriculum.currentLesson?.id === lesson.lessonId) {
      factors.push({ factor: "current_lesson", weight: 40, value: 1 });
    }

    if (lesson.progress > 0 && lesson.progress < 100) {
      factors.push({ factor: "in_progress", weight: 30, value: lesson.progress / 100 });
    }

    const careerIds = input.careerInterests.map(c => c.careerId);
    if (careerIds.length > 0) {
      const careerPriority = getMaxSubjectPriority(careerIds, lesson.subject);
      if (careerPriority > 0) {
        factors.push({ factor: "career_aligned", weight: careerPriority * 2, value: careerPriority / 10 });
      }
    }

    const weakSubjects = input.weakAreas.map(w => w.subject);
    if (weakSubjects.includes(lesson.subject)) {
      factors.push({ factor: "weak_subject", weight: 25, value: 1 });
    }

    if (context.overallCompletion < 50) {
      factors.push({ factor: "low_completion", weight: 15, value: 1 });
    }

    if (context.consistencyScore > 70) {
      factors.push({ factor: "high_consistency", weight: 10, value: context.consistencyScore / 100 });
    }

    return factors;
  }

  /**
   * Get weak area priority factors
   */
  private getWeakAreaPriorityFactors(weakArea: WeakAreaInput, input: RecommendationEngineInput, context: RecommendationContext): PriorityFactor[] {
    const factors: PriorityFactor[] = [];

    const severityScore: Record<string, number> = { critical: 50, high: 40, medium: 30, low: 20 };
    factors.push({ factor: "severity", weight: severityScore[weakArea.severity] || 20, value: 1 });

    factors.push({ factor: "score_gap", weight: 30, value: (100 - weakArea.score) / 100 });

    if (context.timeToExam < 30) {
      factors.push({ factor: "urgent_exam", weight: 20, value: 1 });
    } else if (context.timeToExam < 60) {
      factors.push({ factor: "upcoming_exam", weight: 10, value: 1 });
    }

    const careerIds = input.careerInterests.map(c => c.careerId);
    if (careerIds.length > 0) {
      const careerPriority = getMaxSubjectPriority(careerIds, weakArea.subject);
      if (careerPriority > 0) {
        factors.push({ factor: "career_aligned", weight: careerPriority * 1.5, value: careerPriority / 10 });
      }
    }

    return factors;
  }

  /**
   * Generate recommended lesson
   */
  private generateRecommendedLesson(input: RecommendationEngineInput, context: RecommendationContext, priorities: PriorityScore[]): RecommendedLesson {
    // Find highest priority lesson
    const lessonPriority = priorities.find(p => p.lessonId);
    
    if (!lessonPriority) {
      // Fallback to curriculum recommendation
      const curriculumLesson = input.curriculumProgress.curriculum.recommendedNextLesson;
      if (curriculumLesson) {
        const lesson = input.curriculumProgress.lessons.find(l => l.lessonId === curriculumLesson.id);
        if (lesson) {
          return {
            lessonId: lesson.lessonId,
            lessonTitle: lesson.lessonTitle,
            subject: lesson.subject,
            reason: "Recommended by curriculum system",
            priority: "high",
            estimatedTime: 30,
            prerequisites: [],
          };
        }
      }
      
      // Final fallback
      return {
        lessonId: "unknown",
        lessonTitle: "No lesson available",
        subject: "General",
        reason: "No lessons available",
        priority: "low",
        estimatedTime: 0,
        prerequisites: [],
      };
    }

    const lesson = input.curriculumProgress.lessons.find(l => l.lessonId === lessonPriority.lessonId);
    if (!lesson) {
      return {
        lessonId: "unknown",
        lessonTitle: "No lesson available",
        subject: "General",
        reason: "Lesson not found",
        priority: "low",
        estimatedTime: 0,
        prerequisites: [],
      };
    }

    const priority = this.scoreToPriority(lessonPriority.score);
    const reason = this.generateLessonReason(lesson, context, lessonPriority.factors);

    return {
      lessonId: lesson.lessonId,
      lessonTitle: lesson.lessonTitle,
      subject: lesson.subject,
      reason,
      priority,
      estimatedTime: this.estimateLessonTime(lesson, context),
      prerequisites: [], // TODO: Get from curriculum
    };
  }

  /**
   * Generate recommended revision topic
   */
  private generateRecommendedRevisionTopic(input: RecommendationEngineInput, context: RecommendationContext, priorities: PriorityScore[]): RecommendedRevisionTopic {
    // Find highest priority weak area
    const weakAreaPriority = priorities.find(p => !p.lessonId && input.weakAreas.find(w => w.topicId === p.topicId));
    
    if (!weakAreaPriority || input.weakAreas.length === 0) {
      return {
        topicId: "none",
        topic: "No revision needed",
        subject: "General",
        reason: "No weak areas identified",
        priority: "low",
        estimatedTime: 0,
        recommendedActions: [],
      };
    }

    const weakArea = input.weakAreas.find(w => w.topicId === weakAreaPriority.topicId);
    if (!weakArea) {
      return {
        topicId: "none",
        topic: "No revision needed",
        subject: "General",
        reason: "Weak area not found",
        priority: "low",
        estimatedTime: 0,
        recommendedActions: [],
      };
    }

    const priority = this.scoreToPriority(weakAreaPriority.score);
    const reason = this.generateRevisionReason(weakArea, context, weakAreaPriority.factors);

    return {
      topicId: weakArea.topicId,
      topic: weakArea.topic,
      subject: weakArea.subject,
      reason,
      priority,
      estimatedTime: weakArea.estimatedTimeToImprove || 30,
      recommendedActions: weakArea.recommendedActions,
    };
  }

  /**
   * Generate recommended exam practice
   */
  private generateRecommendedExamPractice(input: RecommendationEngineInput, context: RecommendationContext, priorities: PriorityScore[]): RecommendedExamPractice {
    // Determine practice type based on context
    let practiceType: "past_papers" | "topic_specific" | "mixed" | "timed" = "topic_specific";
    let reason = "Practice on weak areas";

    if (context.timeToExam < 14) {
      practiceType = "timed";
      reason = "Timed practice for exam preparation";
    } else if (context.timeToExam < 30) {
      practiceType = "past_papers";
      reason = "Past paper practice for exam readiness";
    } else if (context.overallCompletion > 75) {
      practiceType = "mixed";
      reason = "Mixed practice for comprehensive review";
    }

    // Find weak area for topic-specific practice
    const weakArea = input.weakAreas.find(w => w.severity === "critical" || w.severity === "high");
    const topic = weakArea?.topic || input.examReadiness.subject;
    const subject = weakArea?.subject || input.examReadiness.subject;

    const priority = this.scoreToPriority(context.timeToExam < 30 ? 80 : 60);

    return {
      examId: undefined,
      subject,
      topic,
      reason,
      priority,
      estimatedTime: practiceType === "timed" ? 60 : 45,
      practiceType,
    };
  }

  /**
   * Generate recommended study action
   */
  private generateRecommendedStudyAction(input: RecommendationEngineInput, context: RecommendationContext, priorities: PriorityScore[]): RecommendedStudyAction {
    const actions: RecommendedStudyAction[] = [];

    // Low completion - focus on progression
    if (context.overallCompletion < 50) {
      actions.push({
        action: "Complete next unlocked lesson",
        reason: "Low overall completion - build momentum",
        priority: "high",
        estimatedTime: 30,
        category: "lesson",
      });
    }

    // Weak areas - focus on revision
    if (context.weakAreaCount > 0) {
      actions.push({
        action: `Revise ${context.weakAreaCount} weak area${context.weakAreaCount > 1 ? 's' : ''}`,
        reason: "Address weak areas to improve performance",
        priority: "critical",
        estimatedTime: 45,
        category: "revision",
      });
    }

    // Low streak - focus on consistency
    if (context.currentStreak === 0) {
      actions.push({
        action: "Complete a lesson to start your streak",
        reason: "No active streak - start today",
        priority: "high",
        estimatedTime: 30,
        category: "lesson",
      });
    }

    // Low consistency - focus on schedule
    if (context.consistencyScore < 50) {
      actions.push({
        action: "Set a consistent study schedule",
        reason: "Low study consistency - establish routine",
        priority: "medium",
        estimatedTime: 10,
        category: "review",
      });
    }

    // Upcoming exam - focus on practice
    if (context.timeToExam < 30) {
      actions.push({
        action: "Practice past exam papers",
        reason: "Exam approaching - intensive practice",
        priority: "critical",
        estimatedTime: 60,
        category: "exam",
      });
    }

    // High completion - focus on mastery
    if (context.overallCompletion > 75) {
      actions.push({
        action: "Deep revision and mastery exercises",
        reason: "Near completion - focus on mastery",
        priority: "high",
        estimatedTime: 50,
        category: "revision",
      });
    }

    // Career goals - focus on career-aligned subjects
    if (context.careerInterestCount > 0) {
      actions.push({
        action: "Focus on career-aligned subjects",
        reason: "Career goals identified - align study",
        priority: "medium",
        estimatedTime: 45,
        category: "lesson",
      });
    }

    // Sort by priority and return highest
    actions.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return actions[0] || {
      action: "Continue with recommended lesson",
      reason: "Maintain consistent study",
      priority: "medium",
      estimatedTime: 30,
      category: "lesson",
    };
  }

  /**
   * Build metadata
   */
  private buildMetadata(input: RecommendationEngineInput, context: RecommendationContext, priorities: PriorityScore[]): RecommendationMetadata {
    const factors = [
      `time_to_exam:${context.timeToExam}`,
      `completion:${context.overallCompletion}`,
      `streak:${context.currentStreak}`,
      `consistency:${context.consistencyScore}`,
      `weak_areas:${context.weakAreaCount}`,
      `goals:${context.goalCount}`,
      `careers:${context.careerInterestCount}`,
    ];

    const confidence = this.calculateConfidence(context, priorities);

    return {
      generatedAt: new Date().toISOString(),
      userId: input.userId,
      confidence,
      factors,
      cacheKey: this.getCacheKey(input),
    };
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(context: RecommendationContext, priorities: PriorityScore[]): number {
    let confidence = 50; // Base confidence

    // Higher confidence with more data
    if (context.weakAreaCount > 0) confidence += 10;
    if (context.goalCount > 0) confidence += 5;
    if (context.careerInterestCount > 0) confidence += 5;

    // Higher confidence with consistent study
    if (context.consistencyScore > 70) confidence += 15;
    if (context.currentStreak > 7) confidence += 10;

    // Lower confidence with low completion
    if (context.overallCompletion < 30) confidence -= 10;

    return Math.min(100, Math.max(0, confidence));
  }

  /**
   * Generate lesson reason
   */
  private generateLessonReason(lesson: any, context: RecommendationContext, factors: PriorityFactor[]): string {
    const reasons: string[] = [];

    if (lesson.progress > 0 && lesson.progress < 100) {
      reasons.push("In progress");
    }

    const careerFactor = factors.find(f => f.factor === "career_aligned");
    if (careerFactor) {
      reasons.push("Career-aligned");
    }

    const weakFactor = factors.find(f => f.factor === "weak_subject");
    if (weakFactor) {
      reasons.push("Weak subject");
    }

    if (context.overallCompletion < 50) {
      reasons.push("Build momentum");
    }

    return reasons.length > 0 ? reasons.join(", ") : "Recommended for study";
  }

  /**
   * Generate revision reason
   */
  private generateRevisionReason(weakArea: any, context: RecommendationContext, factors: PriorityFactor[]): string {
    const reasons: string[] = [];

    reasons.push(`Severity: ${weakArea.severity}`);
    reasons.push(`Score: ${weakArea.score}%`);

    const urgentFactor = factors.find(f => f.factor === "urgent_exam");
    if (urgentFactor) {
      reasons.push("Urgent - exam approaching");
    }

    const careerFactor = factors.find(f => f.factor === "career_aligned");
    if (careerFactor) {
      reasons.push("Career-aligned");
    }

    return reasons.join(", ");
  }

  /**
   * Estimate lesson time
   */
  private estimateLessonTime(lesson: any, context: RecommendationContext): number {
    // Base time
    let time = 30;

    // Adjust based on progress
    if (lesson.progress > 50) {
      time = 20;
    } else if (lesson.progress > 0) {
      time = 25;
    }

    // Adjust based on consistency
    if (context.consistencyScore > 70) {
      time -= 5;
    }

    return Math.max(15, time);
  }

  /**
   * Convert score to priority
   */
  private scoreToPriority(score: number): "critical" | "high" | "medium" | "low" {
    if (score >= 80) return "critical";
    if (score >= 60) return "high";
    if (score >= 40) return "medium";
    return "low";
  }

  /**
   * Get cache key
   */
  private getCacheKey(input: RecommendationEngineInput): string {
    return `usil:${input.userId}:${Date.now()}`;
  }

  /**
   * Get from cache
   */
  private getFromCache(cacheKey: string): RecommendationEngineOutput | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cache
   */
  private setCache(cacheKey: string, data: RecommendationEngineOutput): void {
    this.cache.set(cacheKey, {
      data,
      expiresAt: Date.now() + CACHE_TTL * 1000,
    });
  }
}

// Export singleton instance
export const recommendationEngine = new RecommendationEngine();
