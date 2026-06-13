/**
 * /lib/student-intelligence/services/intelligence.ts
 *
 * Intelligence Engine - Recommendations, Weak Areas, Goals, Achievements
 */

import { getMemory } from "@/lib/cortex/memory";
import { progressService } from "./progress";
import { performanceService } from "./performance";
import { activityService } from "./activity";
import {
  StudentIntelligenceData,
  Recommendation,
  WeakArea,
  Goal,
  Achievement,
  Insight,
  ServiceResponse,
} from "../types";

const CACHE_TTL = 900; // 15 minutes

export class IntelligenceEngine {
  private cache: Map<string, { data: StudentIntelligenceData; expiresAt: number }> = new Map();

  /**
   * Get complete intelligence data for a user
   */
  async getIntelligence(userId: string): Promise<ServiceResponse<StudentIntelligenceData>> {
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

      // Aggregate intelligence from multiple sources
      const recommendations = await this.getRecommendations(userId);
      const weakAreas = await this.getWeakAreas(userId);
      const goals = await this.getGoals(userId);
      const achievements = await this.getAchievements(userId);
      const insights = await this.getInsights(userId);

      const intelligence: StudentIntelligenceData = {
        recommendations,
        weakAreas,
        goals,
        achievements,
        insights,
        lastUpdated: new Date().toISOString(),
      };

      // Cache the result
      this.setCache(userId, intelligence);

      return {
        success: true,
        data: intelligence,
        cached: false,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("[IntelligenceEngine] Error getting intelligence:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        cached: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get recommendations
   */
  async getRecommendations(userId: string): Promise<Recommendation[]> {
    try {
      // Get data from all services
      const progress = await progressService.getProgress(userId);
      const performance = await performanceService.getPerformance(userId);
      const activity = await activityService.getActivity(userId);
      const cortexMemory = await getMemory(userId);

      const recommendations: Recommendation[] = [];

      if (!progress.success || !performance.success || !activity.success || !progress.data || !performance.data || !activity.data) {
        return recommendations;
      }

      // Generate recommendations based on progress
      if (progress.data.overallCompletion < 50) {
        recommendations.push({
          id: crypto.randomUUID(),
          type: "lesson",
          priority: "high",
          title: "Focus on completing lessons",
          description: "Your overall completion is below 50%. Focus on completing more lessons to improve your progress.",
          action: "Continue with current lesson",
          estimatedTime: 30,
          reason: "Low overall completion rate",
          createdAt: new Date().toISOString(),
        });
      }

      // Generate recommendations based on weak areas
      if (cortexMemory.weakTopics && cortexMemory.weakTopics.length > 0) {
        recommendations.push({
          id: crypto.randomUUID(),
          type: "revision",
          priority: "high",
          title: "Review weak topics",
          description: `You have ${cortexMemory.weakTopics.length} weak topic${cortexMemory.weakTopics.length > 1 ? 's' : ''} that need attention.`,
          action: "Start revision session",
          estimatedTime: 45,
          reason: "Weak topics detected",
          createdAt: new Date().toISOString(),
        });
      }

      // Generate recommendations based on performance trends
      if (performance.data.trends.overallTrend === "declining") {
        recommendations.push({
          id: crypto.randomUUID(),
          type: "practice",
          priority: "high",
          title: "Practice more to improve performance",
          description: "Your performance trend is declining. Increase practice to reverse this trend.",
          action: "Take practice quiz",
          estimatedTime: 20,
          reason: "Declining performance trend",
          createdAt: new Date().toISOString(),
        });
      }

      // Generate recommendations based on activity
      if (activity.data.streak.currentStreak === 0) {
        recommendations.push({
          id: crypto.randomUUID(),
          type: "lesson",
          priority: "medium",
          title: "Start a new streak",
          description: "Complete a lesson today to start your study streak.",
          action: "Complete a lesson",
          estimatedTime: 30,
          reason: "No active streak",
          createdAt: new Date().toISOString(),
        });
      }

      // Generate recommendations based on study patterns
      if (activity.data.patterns.consistencyScore < 50) {
        recommendations.push({
          id: crypto.randomUUID(),
          type: "goal",
          priority: "medium",
          title: "Improve study consistency",
          description: "Your study consistency is low. Try to study at the same time every day.",
          action: "Set study schedule",
          estimatedTime: 10,
          reason: "Low study consistency",
          createdAt: new Date().toISOString(),
        });
      }

      // Sort by priority
      recommendations.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      return recommendations.slice(0, 5); // Return top 5 recommendations
    } catch (error) {
      console.error("[IntelligenceEngine] Error getting recommendations:", error);
      return [];
    }
  }

  /**
   * Get weak areas
   */
  async getWeakAreas(userId: string): Promise<WeakArea[]> {
    try {
      const cortexMemory = await getMemory(userId);
      const weakAreas: WeakArea[] = [];

      if (cortexMemory.weakTopics && cortexMemory.weakTopics.length > 0) {
        cortexMemory.weakTopics.forEach((topic, index) => {
          weakAreas.push({
            topicId: crypto.randomUUID(),
            topic: topic,
            subject: "General", // TODO: Extract subject from topic
            severity: index < 2 ? "critical" : index < 4 ? "high" : "medium",
            score: 0, // TODO: Get actual score
            lastAssessed: new Date().toISOString(),
            recommendedActions: [
              "Review fundamentals",
              "Practice exercises",
              "Take quiz",
            ],
            estimatedTimeToImprove: 60,
          });
        });
      }

      return weakAreas;
    } catch (error) {
      console.error("[IntelligenceEngine] Error getting weak areas:", error);
      return [];
    }
  }

  /**
   * Get goals
   */
  async getGoals(userId: string): Promise<Goal[]> {
    try {
      // TODO: Implement goals table
      // For now, return empty array
      return [];
    } catch (error) {
      console.error("[IntelligenceEngine] Error getting goals:", error);
      return [];
    }
  }

  /**
   * Get achievements
   */
  async getAchievements(userId: string): Promise<Achievement[]> {
    try {
      // TODO: Implement achievements table
      // For now, return empty array
      return [];
    } catch (error) {
      console.error("[IntelligenceEngine] Error getting achievements:", error);
      return [];
    }
  }

  /**
   * Get insights
   */
  async getInsights(userId: string): Promise<Insight[]> {
    try {
      const progress = await progressService.getProgress(userId);
      const performance = await performanceService.getPerformance(userId);
      const activity = await activityService.getActivity(userId);
      const cortexMemory = await getMemory(userId);

      const insights: Insight[] = [];

      if (progress.success && progress.data && progress.data.overallCompletion >= 75) {
        insights.push({
          insightId: crypto.randomUUID(),
          type: "learning",
          title: "Great progress!",
          content: `You've completed ${progress.data.overallCompletion}% of your curriculum. Keep up the excellent work!`,
          actionable: false,
          createdAt: new Date().toISOString(),
        });
      }

      if (performance.success && performance.data && performance.data.trends.overallTrend === "improving") {
        insights.push({
          insightId: crypto.randomUUID(),
          type: "performance",
          title: "Performance improving",
          content: "Your performance trend is improving. Continue your current study strategy.",
          actionable: false,
          createdAt: new Date().toISOString(),
        });
      }

      if (activity.success && activity.data && activity.data.streak.currentStreak >= 7) {
        insights.push({
          insightId: crypto.randomUUID(),
          type: "behavior",
          title: "Amazing streak!",
          content: `You have a ${activity.data.streak.currentStreak}-day streak. Consistency is key to success!`,
          actionable: false,
          createdAt: new Date().toISOString(),
        });
      }

      if (cortexMemory.weakTopics && cortexMemory.weakTopics.length > 0) {
        insights.push({
          insightId: crypto.randomUUID(),
          type: "recommendation",
          title: "Focus on weak areas",
          content: `Identified ${cortexMemory.weakTopics.length} weak area${cortexMemory.weakTopics.length > 1 ? 's' : ''} that need attention.`,
          actionable: true,
          createdAt: new Date().toISOString(),
        });
      }

      return insights;
    } catch (error) {
      console.error("[IntelligenceEngine] Error getting insights:", error);
      return [];
    }
  }

  /**
   * Generate recommendations
   */
  async generateRecommendations(userId: string): Promise<Recommendation[]> {
    // Invalidate cache to force fresh recommendations
    await this.invalidateCache(userId);
    return this.getRecommendations(userId);
  }

  /**
   * Detect weak areas
   */
  async detectWeakAreas(userId: string): Promise<WeakArea[]> {
    // Invalidate cache to force fresh weak area detection
    await this.invalidateCache(userId);
    return this.getWeakAreas(userId);
  }

  /**
   * Invalidate cache for a user
   */
  async invalidateCache(userId: string): Promise<void> {
    this.cache.delete(userId);
  }

  /**
   * Get from cache
   */
  private getFromCache(userId: string): StudentIntelligenceData | null {
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
  private setCache(userId: string, data: StudentIntelligenceData): void {
    this.cache.set(userId, {
      data,
      expiresAt: Date.now() + CACHE_TTL * 1000,
    });
  }
}

// Export singleton instance
export const intelligenceEngine = new IntelligenceEngine();
