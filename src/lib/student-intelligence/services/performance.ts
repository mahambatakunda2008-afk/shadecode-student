/**
 * /lib/student-intelligence/services/performance.ts
 *
 * Performance aggregation service
 */

import { createClient } from "@/lib/supabase/client";
import { getMemory } from "@/lib/cortex/memory";
import {
  StudentPerformance,
  ExamPerformance,
  QuizPerformance,
  ChallengePerformance,
  PerformanceTrends,
  ServiceResponse,
} from "../types";

const CACHE_TTL = 600; // 10 minutes

export class PerformanceService {
  private cache: Map<string, { data: StudentPerformance; expiresAt: number }> = new Map();

  /**
   * Get complete performance data for a user
   */
  async getPerformance(userId: string): Promise<ServiceResponse<StudentPerformance>> {
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

      // Aggregate performance from multiple sources
      const exams = await this.getExamPerformance(userId);
      const quizzes = await this.getQuizPerformance(userId);
      const challenges = await this.getChallengePerformance(userId);
      const trends = await this.getPerformanceTrends(userId, exams);

      const performance: StudentPerformance = {
        exams,
        quizzes,
        challenges,
        trends,
        lastUpdated: new Date().toISOString(),
      };

      // Cache the result
      this.setCache(userId, performance);

      return {
        success: true,
        data: performance,
        cached: false,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("[PerformanceService] Error getting performance:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        cached: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get exam performance
   */
  async getExamPerformance(userId: string): Promise<ExamPerformance[]> {
    try {
      const supabase = createClient();

      // TODO: Implement exam results table
      // For now, return empty array
      return [];
    } catch (error) {
      console.error("[PerformanceService] Error getting exam performance:", error);
      return [];
    }
  }

  /**
   * Get quiz performance
   */
  async getQuizPerformance(userId: string): Promise<QuizPerformance[]> {
    try {
      const supabase = createClient();

      // TODO: Implement quiz results tracking
      // For now, return empty array
      return [];
    } catch (error) {
      console.error("[PerformanceService] Error getting quiz performance:", error);
      return [];
    }
  }

  /**
   * Get challenge performance
   */
  async getChallengePerformance(userId: string): Promise<ChallengePerformance[]> {
    try {
      const supabase = createClient();

      const { data: challenges, error } = await supabase
        .from("daily_challenges")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        console.error("[PerformanceService] Error getting challenge performance:", error);
        return [];
      }

      return (challenges || []).map((challenge) => ({
        challengeId: challenge.id,
        completed: challenge.completed || false,
        score: challenge.score || 0,
        date: challenge.created_at,
        streak: challenge.streak || 0,
      }));
    } catch (error) {
      console.error("[PerformanceService] Error getting challenge performance:", error);
      return [];
    }
  }

  /**
   * Get performance trends
   */
  async getPerformanceTrends(
    userId: string,
    exams: ExamPerformance[]
  ): Promise<PerformanceTrends> {
    try {
      // Get Cortex memory for additional performance data
      const cortexMemory = await getMemory(userId);
      
      // Calculate trends based on exam performance
      const overallTrend = this.calculateOverallTrend(exams);
      const subjectTrends = this.calculateSubjectTrends(exams);
      const averageScore = this.calculateAverageScore(exams);
      const recentAverage = this.calculateRecentAverage(exams);
      const improvementRate = this.calculateImprovementRate(exams);

      return {
        overallTrend,
        subjectTrends,
        averageScore,
        recentAverage,
        improvementRate,
      };
    } catch (error) {
      console.error("[PerformanceService] Error getting performance trends:", error);
      return this.getEmptyTrends();
    }
  }

  /**
   * Add exam result
   */
  async addExamResult(userId: string, result: ExamPerformance): Promise<void> {
    try {
      const supabase = createClient();

      // TODO: Implement exam results table
      // For now, just invalidate cache
      this.invalidateCache(userId);
    } catch (error) {
      console.error("[PerformanceService] Error adding exam result:", error);
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
   * Calculate overall trend
   */
  private calculateOverallTrend(exams: ExamPerformance[]): "improving" | "stable" | "declining" {
    if (exams.length < 2) return "stable";

    const recent = exams.slice(0, 5);
    const older = exams.slice(5, 10);

    if (older.length === 0) return "stable";

    const recentAvg = recent.reduce((sum, e) => sum + e.percentage, 0) / recent.length;
    const olderAvg = older.reduce((sum, e) => sum + e.percentage, 0) / older.length;

    if (recentAvg > olderAvg + 5) return "improving";
    if (recentAvg < olderAvg - 5) return "declining";
    return "stable";
  }

  /**
   * Calculate subject trends
   */
  private calculateSubjectTrends(
    exams: ExamPerformance[]
  ): Record<string, "improving" | "stable" | "declining"> {
    const subjectMap = new Map<string, ExamPerformance[]>();

    exams.forEach((exam) => {
      if (!subjectMap.has(exam.subject)) {
        subjectMap.set(exam.subject, []);
      }
      subjectMap.get(exam.subject)!.push(exam);
    });

    const trends: Record<string, "improving" | "stable" | "declining"> = {};

    subjectMap.forEach((subjectExams, subject) => {
      trends[subject] = this.calculateOverallTrend(subjectExams);
    });

    return trends;
  }

  /**
   * Calculate average score
   */
  private calculateAverageScore(exams: ExamPerformance[]): number {
    if (exams.length === 0) return 0;

    const totalScore = exams.reduce((sum, exam) => sum + exam.percentage, 0);
    return Math.round(totalScore / exams.length);
  }

  /**
   * Calculate recent average
   */
  private calculateRecentAverage(exams: ExamPerformance[]): number {
    if (exams.length === 0) return 0;

    const recent = exams.slice(0, 5);
    const totalScore = recent.reduce((sum, exam) => sum + exam.percentage, 0);
    return Math.round(totalScore / recent.length);
  }

  /**
   * Calculate improvement rate
   */
  private calculateImprovementRate(exams: ExamPerformance[]): number {
    if (exams.length < 2) return 0;

    const first = exams[exams.length - 1];
    const last = exams[0];

    return last.percentage - first.percentage;
  }

  /**
   * Get empty trends
   */
  private getEmptyTrends(): PerformanceTrends {
    return {
      overallTrend: "stable",
      subjectTrends: {},
      averageScore: 0,
      recentAverage: 0,
      improvementRate: 0,
    };
  }

  /**
   * Get from cache
   */
  private getFromCache(userId: string): StudentPerformance | null {
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
  private setCache(userId: string, data: StudentPerformance): void {
    this.cache.set(userId, {
      data,
      expiresAt: Date.now() + CACHE_TTL * 1000,
    });
  }
}

// Export singleton instance
export const performanceService = new PerformanceService();
