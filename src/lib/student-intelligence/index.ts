/**
 * /lib/student-intelligence/index.ts
 * Unified Student Intelligence Layer - Main Entry Point
 */

import type { StudentIntelligence } from "./types";
import { progressService, performanceService, activityService, intelligenceEngine } from "./deviceFirstServices";

/** Get complete student intelligence for a user. */
export async function getStudentIntelligence(userId: string): Promise<StudentIntelligence | null> {
  try {
    const [progress, performance, activity, intelligence] = await Promise.all([
      progressService.getProgress(userId),
      performanceService.getPerformance(userId),
      activityService.getActivity(userId),
      intelligenceEngine.getIntelligence(userId),
    ]);
    if (!progress.success || !progress.data || !performance.success || !performance.data || !activity.success || !activity.data || !intelligence.success || !intelligence.data) return null;
    return {
      userId,
      progress: progress.data,
      performance: performance.data,
      activity: activity.data,
      intelligence: intelligence.data,
      version: 1,
      lastUpdated: new Date().toISOString(),
      cacheKey: `usil:${userId}:${Date.now()}`,
    };
  } catch (error) {
    console.error("[StudentIntelligence] Error getting student intelligence:", error);
    return null;
  }
}

export async function invalidateAllCaches(userId: string): Promise<void> {
  await Promise.all([
    progressService.invalidateCache(userId),
    performanceService.invalidateCache(userId),
    activityService.invalidateCache(userId),
    intelligenceEngine.invalidateCache(userId),
  ]);
}

export { progressService, performanceService, activityService, intelligenceEngine } from "./deviceFirstServices";
export * from "./types";
