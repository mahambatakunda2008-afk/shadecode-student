/**
 * /lib/student-intelligence/adapters/cortex.adapter.ts
 *
 * Cortex system adapter
 */

import { getMemory } from "@/lib/cortex/memory";
import { emitCortexEvent } from "@/lib/cortex/events/emit";
import {
  SystemAdapter,
  StudentProgress,
  StudentPerformance,
  StudentActivity,
  StudentIntelligenceData,
} from "../types";

export class CortexAdapter implements SystemAdapter {
  name = "cortex";

  async initialize(): Promise<void> {
    // Initialize Cortex connection
    // No special initialization needed for now
  }

  async getProgress(userId: string): Promise<Partial<StudentProgress>> {
    try {
      const memory = await getMemory(userId);

      return {
        // Cortex doesn't directly track lesson progress
        // But it tracks weak topics and strong subjects
        // This can be used to inform progress
      };
    } catch (error) {
      console.error("[CortexAdapter] Error getting progress:", error);
      return {};
    }
  }

  async getPerformance(userId: string): Promise<Partial<StudentPerformance>> {
    try {
      const memory = await getMemory(userId);

      return {
        // Cortex tracks exam performance insights
        // This can be used to inform performance
      };
    } catch (error) {
      console.error("[CortexAdapter] Error getting performance:", error);
      return {};
    }
  }

  async getActivity(userId: string): Promise<Partial<StudentActivity>> {
    try {
      const memory = await getMemory(userId);

      return {
        // Cortex tracks activity through events
        // This can be used to inform activity
      };
    } catch (error) {
      console.error("[CortexAdapter] Error getting activity:", error);
      return {};
    }
  }

  async getIntelligence(userId: string): Promise<Partial<StudentIntelligenceData>> {
    try {
      const memory = await getMemory(userId);

      return {
        // Cortex provides intelligence data
        weakAreas: memory.weakTopics?.map((topic: string, index: number) => ({
          topicId: crypto.randomUUID(),
          topic,
          subject: "General",
          severity: index < 2 ? "critical" : index < 4 ? "high" : "medium",
          score: 0,
          lastAssessed: new Date().toISOString(),
          recommendedActions: ["Review fundamentals", "Practice exercises"],
          estimatedTimeToImprove: 60,
        })) || [],
      };
    } catch (error) {
      console.error("[CortexAdapter] Error getting intelligence:", error);
      return {};
    }
  }

  async onEvent(event: any): Promise<void> {
    try {
      // Forward events to Cortex
      await emitCortexEvent(event);
    } catch (error) {
      console.error("[CortexAdapter] Error forwarding event:", error);
    }
  }
}

// Export singleton instance
export const cortexAdapter = new CortexAdapter();
