/**
 * /lib/events/handlers/AchievementsEventHandler.ts
 *
 * Event Handler for Achievements
 */

import { UnifiedEvent, EventHandler } from "../types";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  evaluateAchievements,
  getNewlyUnlockedAchievements,
  onTaskCompleted,
  onStreakUpdate,
  onPerfectDay,
  type UserStats,
  type AchievementEvent,
  type Achievement,
  ACHIEVEMENTS,
} from "@/modules/achievements/achievements";

export class AchievementsEventHandler implements EventHandler {
  priority = 3; // Lower priority - achievements can be processed after analytics

  async handle(event: UnifiedEvent): Promise<void> {
    try {
      await this.checkAchievements(event);
    } catch (error) {
      console.error("[AchievementsEventHandler] Error:", error);
    }
  }

  private async checkAchievements(event: UnifiedEvent): Promise<void> {
    const supabase = this.getSupabaseClient();
    const userId = event.userId;

    // Fetch current user stats
    const stats = await this.fetchUserStats(supabase, userId);
    if (!stats) return;

    // Fetch existing achievements from database
    const existingAchievements = await this.fetchExistingAchievements(supabase, userId);

    // Map event to achievement event type
    const achievementEvent = this.mapEventToAchievementEvent(event);
    if (!achievementEvent) return;

    // Update stats based on event using direct functions
    let updatedStats = { ...stats };
    switch (achievementEvent) {
      case "TASK_COMPLETED":
        updatedStats = onTaskCompleted(updatedStats);
        break;
      case "STREAK_UPDATED":
        updatedStats = onStreakUpdate(updatedStats, true);
        break;
      case "PERFECT_DAY":
        updatedStats = onPerfectDay(updatedStats);
        break;
    }

    // Evaluate achievements with updated stats
    const evaluatedAchievements = evaluateAchievements(updatedStats, existingAchievements);

    // Find newly unlocked achievements
    const newlyUnlocked = getNewlyUnlockedAchievements(existingAchievements, evaluatedAchievements);

    if (newlyUnlocked.length > 0) {
      await this.saveNewAchievements(supabase, userId, newlyUnlocked);
      console.log(`[Achievements] Unlocked ${newlyUnlocked.length} achievements for user ${userId}`);
    }
  }

  private getSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing Supabase credentials");
    return createSupabaseClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  private async fetchUserStats(supabase: any, userId: string): Promise<UserStats | null> {
    try {
      const [{ data: tasks }, { data: profile }] = await Promise.all([
        supabase.from("tasks").select("completed").eq("user_id", userId),
        supabase.from("profiles").select("streak, longest_streak").eq("id", userId).single(),
      ]);

      if (!tasks || !profile) return null;

      const completedTasks = (tasks as any[]).filter((t: any) => t.completed).length;
      const streak = Number(profile.streak ?? 0);
      const longestStreak = Number(profile.longest_streak ?? 0);

      return {
        tasksCompleted: completedTasks,
        currentStreak: streak,
        longestStreak,
        perfectDays: 0, // TODO: Implement perfect day tracking
        loginStreak: streak,
        lastActive: new Date(),
      };
    } catch (error) {
      console.error("[Achievements] Error fetching user stats:", error);
      return null;
    }
  }

  private async fetchExistingAchievements(supabase: any, userId: string): Promise<Achievement[]> {
    try {
      const { data } = await supabase
        .from("achievements")
        .select("*")
        .eq("user_id", userId);

      if (!data) return ACHIEVEMENTS;

      // Map database achievements to Achievement type
      const unlockedIds = new Set((data as any[]).map((a: any) => a.title));
      
      return ACHIEVEMENTS.map((achievement) => ({
        ...achievement,
        unlocked: unlockedIds.has(achievement.title),
        progress: achievement.unlocked ? achievement.requirement : 0,
      }));
    } catch (error) {
      console.error("[Achievements] Error fetching existing achievements:", error);
      return ACHIEVEMENTS;
    }
  }

  private mapEventToAchievementEvent(event: UnifiedEvent): AchievementEvent | null {
    switch (event.type) {
      case "study_session_finished":
        return "TASK_COMPLETED";
      case "lesson_completed":
        return "TASK_COMPLETED";
      case "challenge_completed":
        return "TASK_COMPLETED";
      default:
        return null;
    }
  }

  private async saveNewAchievements(supabase: any, userId: string, achievements: Achievement[]): Promise<void> {
    try {
      const achievementsToInsert = achievements.map((achievement) => ({
        user_id: userId,
        title: achievement.title,
        description: achievement.description,
        rarity: achievement.rarity,
        xp_reward: achievement.xpReward,
      }));

      await supabase.from("achievements").insert(achievementsToInsert);
    } catch (error) {
      console.error("[Achievements] Error saving achievements:", error);
    }
  }
}
