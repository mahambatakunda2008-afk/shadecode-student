/**
 * /lib/student-intelligence/services/activity.ts
 *
 * Activity aggregation service
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMemory } from "@/lib/cortex/memory";
import {
  StudentActivity,
  StudySession,
  Activity,
  TimeSpentBySubject,
  ActivityPatterns,
  StreakInfo,
  ServiceResponse,
} from "../types";

const CACHE_TTL = 300; // 5 minutes

export class ActivityService {
  private cache: Map<string, { data: StudentActivity; expiresAt: number }> = new Map();

  /**
   * Get complete activity data for a user
   */
  async getActivity(userId: string): Promise<ServiceResponse<StudentActivity>> {
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

      // Aggregate activity from multiple sources
      const sessions = await this.getStudySessions(userId);
      const timeSpent = await this.getTimeSpent(userId, sessions);
      const patterns = await this.getActivityPatterns(userId, sessions);
      const streak = await this.getStreakInfo(userId);

      const activity: StudentActivity = {
        sessions,
        timeSpent,
        patterns,
        streak,
        lastUpdated: new Date().toISOString(),
      };

      // Cache the result
      this.setCache(userId, activity);

      return {
        success: true,
        data: activity,
        cached: false,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("[ActivityService] Error getting activity:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        cached: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get study sessions
   */
  async getStudySessions(userId: string, limit: number = 30): Promise<StudySession[]> {
    try {
      const supabase = await createSupabaseServerClient();

      // TODO: Implement study sessions table
      // For now, return empty array
      return [];
    } catch (error) {
      console.error("[ActivityService] Error getting study sessions:", error);
      return [];
    }
  }

  /**
   * Get time spent by subject
   */
  async getTimeSpent(userId: string, sessions: StudySession[]): Promise<TimeSpentBySubject> {
    try {
      // Group sessions by subject
      const subjectMap = new Map<string, { totalMinutes: number; sessions: number }>();

      sessions.forEach((session) => {
        if (!subjectMap.has(session.subject)) {
          subjectMap.set(session.subject, { totalMinutes: 0, sessions: 0 });
        }
        const data = subjectMap.get(session.subject)!;
        data.totalMinutes += session.duration;
        data.sessions += 1;
      });

      // Calculate time spent for each subject
      const timeSpent: TimeSpentBySubject = {};

      subjectMap.forEach((data, subject) => {
        timeSpent[subject] = {
          totalMinutes: data.totalMinutes,
          sessions: data.sessions,
          averageSessionLength: data.sessions > 0 ? data.totalMinutes / data.sessions : 0,
        };
      });

      return timeSpent;
    } catch (error) {
      console.error("[ActivityService] Error getting time spent:", error);
      return {};
    }
  }

  /**
   * Get activity patterns
   */
  async getActivityPatterns(userId: string, sessions: StudySession[]): Promise<ActivityPatterns> {
    try {
      if (sessions.length === 0) {
        return this.getEmptyPatterns();
      }

      // Calculate most active time
      const hourCounts = new Map<number, number>();
      sessions.forEach((session) => {
        const hour = new Date(session.startTime).getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      });

      let mostActiveHour = 0;
      let maxCount = 0;
      hourCounts.forEach((count, hour) => {
        if (count > maxCount) {
          maxCount = count;
          mostActiveHour = hour;
        }
      });

      const mostActiveTime = `${mostActiveHour}:00`;

      // Calculate most active day
      const dayCounts = new Map<number, number>();
      sessions.forEach((session) => {
        const day = new Date(session.startTime).getDay();
        dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
      });

      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      let mostActiveDayIndex = 0;
      let maxDayCount = 0;
      dayCounts.forEach((count, day) => {
        if (count > maxDayCount) {
          maxDayCount = count;
          mostActiveDayIndex = day;
        }
      });

      const mostActiveDay = days[mostActiveDayIndex];

      // Calculate average daily study time
      const totalMinutes = sessions.reduce((sum, session) => sum + session.duration, 0);
      const uniqueDays = new Set(sessions.map((s) => new Date(s.startTime).toDateString())).size;
      const averageDailyStudyTime = uniqueDays > 0 ? totalMinutes / uniqueDays : 0;

      // Calculate study frequency (sessions per day)
      const studyFrequency = uniqueDays > 0 ? sessions.length / uniqueDays : 0;

      // Calculate consistency score
      const consistencyScore = this.calculateConsistencyScore(sessions);

      return {
        mostActiveTime,
        mostActiveDay,
        averageDailyStudyTime,
        studyFrequency,
        consistencyScore,
      };
    } catch (error) {
      console.error("[ActivityService] Error getting activity patterns:", error);
      return this.getEmptyPatterns();
    }
  }

  /**
   * Get streak info
   */
  async getStreakInfo(userId: string): Promise<StreakInfo> {
    try {
      const supabase = await createSupabaseServerClient();

      // Get latest challenge for streak info
      const { data: challenge, error } = await supabase
        .from("daily_challenges")
        .select("streak, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error || !challenge) {
        return this.getEmptyStreak();
      }

      return {
        currentStreak: challenge.streak || 0,
        longestStreak: challenge.streak || 0, // TODO: Track longest streak separately
        lastStudyDate: challenge.created_at,
      };
    } catch (error) {
      console.error("[ActivityService] Error getting streak info:", error);
      return this.getEmptyStreak();
    }
  }

  /**
   * Record a study session
   */
  async recordSession(userId: string, session: StudySession): Promise<void> {
    try {
      const supabase = await createSupabaseServerClient();

      // TODO: Implement study sessions table
      // For now, just invalidate cache
      this.invalidateCache(userId);
    } catch (error) {
      console.error("[ActivityService] Error recording session:", error);
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
   * Calculate consistency score
   */
  private calculateConsistencyScore(sessions: StudySession[]): number {
    if (sessions.length === 0) return 0;

    // Calculate variance in session times
    const sessionTimes = sessions.map((s) => new Date(s.startTime).getHours());
    const mean = sessionTimes.reduce((sum, time) => sum + time, 0) / sessionTimes.length;
    const variance = sessionTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / sessionTimes.length;
    const stdDev = Math.sqrt(variance);

    // Lower standard deviation = higher consistency
    // Normalize to 0-100 scale
    const consistencyScore = Math.max(0, 100 - stdDev * 5);
    return Math.round(consistencyScore);
  }

  /**
   * Get empty patterns
   */
  private getEmptyPatterns(): ActivityPatterns {
    return {
      mostActiveTime: "N/A",
      mostActiveDay: "N/A",
      averageDailyStudyTime: 0,
      studyFrequency: 0,
      consistencyScore: 0,
    };
  }

  /**
   * Get empty streak
   */
  private getEmptyStreak(): StreakInfo {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: new Date().toISOString(),
    };
  }

  /**
   * Get from cache
   */
  private getFromCache(userId: string): StudentActivity | null {
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
  private setCache(userId: string, data: StudentActivity): void {
    this.cache.set(userId, {
      data,
      expiresAt: Date.now() + CACHE_TTL * 1000,
    });
  }
}

// Export singleton instance
export const activityService = new ActivityService();
