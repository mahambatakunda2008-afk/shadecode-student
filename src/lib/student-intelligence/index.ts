/**
 * /lib/student-intelligence/index.ts
 *
 * Unified Student Intelligence Layer - Main Entry Point
 */

import { StudentIntelligence } from "./types";
import { progressService } from "./services/progress";
import { performanceService } from "./services/performance";
import { activityService } from "./services/activity";
import { intelligenceEngine } from "./services/intelligence";

/**
 * Get complete student intelligence for a user
 */
export async function getStudentIntelligence(userId: string): Promise<StudentIntelligence | null> {
  try {
    // Get data from all services
    const [progress, performance, activity, intelligence] = await Promise.all([
      progressService.getProgress(userId),
      performanceService.getPerformance(userId),
      activityService.getActivity(userId),
      intelligenceEngine.getIntelligence(userId),
    ]);

    if (!progress.success || !progress.data) {
      console.error("[StudentIntelligence] Failed to get progress data");
      return null;
    }

    if (!performance.success || !performance.data) {
      console.error("[StudentIntelligence] Failed to get performance data");
      return null;
    }

    if (!activity.success || !activity.data) {
      console.error("[StudentIntelligence] Failed to get activity data");
      return null;
    }

    if (!intelligence.success || !intelligence.data) {
      console.error("[StudentIntelligence] Failed to get intelligence data");
      return null;
    }

    const studentIntelligence: StudentIntelligence = {
      userId,
      progress: progress.data,
      performance: performance.data,
      activity: activity.data,
      intelligence: intelligence.data,
      version: 1,
      lastUpdated: new Date().toISOString(),
      cacheKey: `usil:${userId}:${Date.now()}`,
    };

    return studentIntelligence;
  } catch (error) {
    console.error("[StudentIntelligence] Error getting student intelligence:", error);
    return null;
  }
}

/**
 * Invalidate all caches for a user
 */
export async function invalidateAllCaches(userId: string): Promise<void> {
  await Promise.all([
    progressService.invalidateCache(userId),
    performanceService.invalidateCache(userId),
    activityService.invalidateCache(userId),
    intelligenceEngine.invalidateCache(userId),
  ]);
}

// Export services for direct access
export { progressService } from "./services/progress";
export { performanceService } from "./services/performance";
export { activityService } from "./services/activity";
export { intelligenceEngine } from "./services/intelligence";

// Export types
export * from "./types";
