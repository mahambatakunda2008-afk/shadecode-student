/**
 * XP Manager - Centralized XP System
 * 
 * This module provides a unified interface for awarding XP to users.
 * All XP-related operations should go through this manager to ensure
 * consistency across the application.
 */

import { createClient } from "@/lib/supabase/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type XPSource = 
  | "task_completion"
  | "lesson_generation"
  | "lesson_completion"
  | "exam_completion"
  | "streak_milestone"
  | "achievement_unlock"
  | "perfect_day";

export interface XPAward {
  amount: number;
  source: XPSource;
  metadata?: Record<string, any>;
}

export interface XPResult {
  success: boolean;
  xp: number;
  level: number;
  streak: number;
  error?: string;
}

/**
 * XP amounts for different actions
 * These values should be consistent with the game design
 */
const XP_AMOUNTS: Record<XPSource, (difficulty?: string) => number> = {
  task_completion: () => 10,
  lesson_generation: (difficulty = "medium") => {
    switch (difficulty) {
      case "hard": return 30;
      case "medium": return 25;
      case "easy": return 20;
      default: return 25;
    }
  },
  lesson_completion: () => 35,
  exam_completion: () => 50,
  streak_milestone: (days) => {
    const dayCount = parseInt(days || "3");
    if (dayCount >= 30) return 500;
    if (dayCount >= 7) return 150;
    if (dayCount >= 3) return 75;
    return 25;
  },
  achievement_unlock: (rarity) => {
    switch (rarity) {
      case "legendary": return 500;
      case "epic": return 250;
      case "rare": return 100;
      case "common": return 25;
      default: return 50;
    }
  },
  perfect_day: () => 80,
};

/**
 * Award XP to a user (client-side)
 * 
 * @param userId - The user ID to award XP to
 * @param award - The XP award details
 * @returns The result of the XP award operation
 */
export async function awardXPClient(userId: string, award: XPAward): Promise<XPResult> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase.rpc("increment_xp", {
      user_id: userId,
      amount: award.amount,
    });

    if (error) {
      console.error("[XP Manager] Error awarding XP:", error);
      return {
        success: false,
        xp: 0,
        level: 1,
        streak: 0,
        error: error.message,
      };
    }

    return {
      success: true,
      xp: data?.[0]?.xp ?? 0,
      level: data?.[0]?.level ?? 1,
      streak: data?.[0]?.streak ?? 0,
    };
  } catch (error) {
    console.error("[XP Manager] Unexpected error:", error);
    return {
      success: false,
      xp: 0,
      level: 1,
      streak: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Award XP to a user (server-side)
 * 
 * @param userId - The user ID to award XP to
 * @param award - The XP award details
 * @returns The result of the XP award operation
 */
export async function awardXP(userId: string, award: XPAward): Promise<XPResult> {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data, error } = await supabase.rpc("increment_xp", {
      user_id: userId,
      amount: award.amount,
    });

    if (error) {
      console.error("[XP Manager] Error awarding XP:", error);
      return {
        success: false,
        xp: 0,
        level: 1,
        streak: 0,
        error: error.message,
      };
    }

    return {
      success: true,
      xp: data?.[0]?.xp ?? 0,
      level: data?.[0]?.level ?? 1,
      streak: data?.[0]?.streak ?? 0,
    };
  } catch (error) {
    console.error("[XP Manager] Unexpected error:", error);
    return {
      success: false,
      xp: 0,
      level: 1,
      streak: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get the XP amount for a specific source
 * 
 * @param source - The XP source
 * @param metadata - Optional metadata for calculating amount (e.g., difficulty)
 * @returns The XP amount
 */
export function getXPAmount(source: XPSource, metadata?: Record<string, any>): number {
  const amountFn = XP_AMOUNTS[source];
  if (!amountFn) return 10; // Default fallback
  
  return amountFn(metadata?.difficulty || metadata?.rarity || metadata?.days);
}

/**
 * Award XP with automatic amount calculation
 * 
 * @param userId - The user ID to award XP to
 * @param source - The XP source
 * @param metadata - Optional metadata for calculating amount
 * @returns The result of the XP award operation
 */
export async function awardXPBySource(
  userId: string,
  source: XPSource,
  metadata?: Record<string, any>
): Promise<XPResult> {
  const amount = getXPAmount(source, metadata);
  return awardXP(userId, { amount, source, metadata });
}

/**
 * Calculate level from XP
 * Level = floor(xp / 100) + 1
 * 
 * @param xp - The user's XP
 * @returns The calculated level
 */
export function calculateLevel(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

/**
 * Calculate XP needed for a specific level
 * XP needed = (level - 1) * 100
 * 
 * @param level - The target level
 * @returns The XP needed
 */
export function xpForLevel(level: number): number {
  return (level - 1) * 100;
}

/**
 * Calculate XP progress within current level
 * 
 * @param xp - The user's XP
 * @returns The progress percentage (0-100)
 */
export function xpProgress(xp: number): number {
  const level = calculateLevel(xp);
  const levelStartXP = xpForLevel(level);
  const levelEndXP = xpForLevel(level + 1);
  const levelXP = levelEndXP - levelStartXP;
  const currentLevelXP = xp - levelStartXP;
  
  return Math.min(100, Math.max(0, (currentLevelXP / levelXP) * 100));
}
