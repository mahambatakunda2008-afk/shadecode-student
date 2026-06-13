/**
 * /lib/events/EventPipeline.ts
 *
 * Unified Event Pipeline - Single Event Service
 */

import {
  UnifiedEvent,
  EventType,
  EventHandler,
  EventSubscription,
  EventPipelineConfig,
} from "./types";

export class EventPipeline {
  private static instance: EventPipeline;
  private subscriptions: Map<EventType, EventHandler[]> = new Map();
  private config: EventPipelineConfig;
  private eventHistory: UnifiedEvent[] = [];
  private maxHistorySize = 1000;

  private constructor(config: Partial<EventPipelineConfig> = {}) {
    this.config = {
      enablePersistence: true,
      enableRealtime: true,
      enableAnalytics: true,
      enableCortex: true,
      enableAchievements: true,
      enableRecommendations: true,
      ...config,
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<EventPipelineConfig>): EventPipeline {
    if (!EventPipeline.instance) {
      EventPipeline.instance = new EventPipeline(config);
    }
    return EventPipeline.instance;
  }

  /**
   * Emit an event to the pipeline
   */
  async emit(event: UnifiedEvent): Promise<void> {
    try {
      // Add to history
      this.addToHistory(event);

      // Route to subscribers
      const handlers = this.subscriptions.get(event.type) || [];
      
      // Execute handlers in priority order
      const sortedHandlers = handlers.sort((a, b) => a.priority - b.priority);
      
      for (const handler of sortedHandlers) {
        try {
          await handler.handle(event);
        } catch (error) {
          console.error(`[EventPipeline] Handler error for ${event.type}:`, error);
        }
      }

      // Persist event if enabled
      if (this.config.enablePersistence) {
        await this.persistEvent(event);
      }

      // Send to Cortex if enabled
      if (this.config.enableCortex) {
        await this.sendToCortex(event);
      }

      // Send to analytics if enabled
      if (this.config.enableAnalytics) {
        await this.sendToAnalytics(event);
      }
    } catch (error) {
      console.error("[EventPipeline] Error emitting event:", error);
      throw error;
    }
  }

  /**
   * Subscribe to an event type
   */
  subscribe(eventType: EventType, handler: EventHandler): void {
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }
    this.subscriptions.get(eventType)!.push(handler);
  }

  /**
   * Unsubscribe from an event type
   */
  unsubscribe(eventType: EventType, handler: EventHandler): void {
    const handlers = this.subscriptions.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Add event to history
   */
  private addToHistory(event: UnifiedEvent): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Get event history
   */
  getHistory(limit?: number): UnifiedEvent[] {
    if (limit) {
      return this.eventHistory.slice(-limit);
    }
    return [...this.eventHistory];
  }

  /**
   * Persist event to database
   */
  private async persistEvent(event: UnifiedEvent): Promise<void> {
    // TODO: Implement persistence to events table
    // This would store events in the database for analytics and replay
  }

  /**
   * Send event to Cortex
   */
  private async sendToCortex(event: UnifiedEvent): Promise<void> {
    // TODO: Integrate with Cortex event system
    // This would send the event to Cortex for intelligence processing
  }

  /**
   * Send event to analytics
   */
  private async sendToAnalytics(event: UnifiedEvent): Promise<void> {
    // TODO: Integrate with analytics system
    // This would send the event to analytics for tracking
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<EventPipelineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): EventPipelineConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const eventPipeline = EventPipeline.getInstance();
