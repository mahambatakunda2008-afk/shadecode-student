/**
 * /lib/events/EventPipeline.ts
 *
 * Unified Event Pipeline - Single Event Service
 *
 * The pipeline is intentionally idempotent by canonical event id. A replayed
 * event must not execute Cortex/recommendation/analytics handlers twice in the
 * same runtime. Durable cross-device idempotency remains a server concern.
 */

import {
  UnifiedEvent,
  EventType,
  EventHandler,
  EventPipelineConfig,
} from "./types";

export class EventPipeline {
  private static instance: EventPipeline;
  private subscriptions: Map<EventType, EventHandler[]> = new Map();
  private config: EventPipelineConfig;
  private eventHistory: UnifiedEvent[] = [];
  private maxHistorySize = 1000;
  private processedEventIds = new Set<string>();
  private maxProcessedIds = 5000;

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

  static getInstance(config?: Partial<EventPipelineConfig>): EventPipeline {
    if (!EventPipeline.instance) {
      EventPipeline.instance = new EventPipeline(config);
    }
    return EventPipeline.instance;
  }

  /**
   * Emit an event exactly once per event id for this runtime.
   * Returns false when the event was already processed.
   */
  async emit(event: UnifiedEvent): Promise<boolean> {
    if (!event.id || !event.userId) {
      throw new Error("Unified event requires both id and userId");
    }

    if (this.processedEventIds.has(event.id)) {
      return false;
    }

    // Mark before dispatch so a re-entrant replay cannot execute handlers twice.
    this.processedEventIds.add(event.id);
    this.trimProcessedIds();

    try {
      this.addToHistory(event);

      const handlers = this.subscriptions.get(event.type) || [];
      const sortedHandlers = [...handlers].sort((a, b) => a.priority - b.priority);

      for (const handler of sortedHandlers) {
        try {
          await handler.handle(event);
        } catch (error) {
          console.error(`[EventPipeline] Handler error for ${event.type}:`, error);
        }
      }

      if (this.config.enablePersistence) {
        await this.persistEvent(event);
      }

      if (this.config.enableCortex) {
        await this.sendToCortex(event);
      }

      if (this.config.enableAnalytics) {
        await this.sendToAnalytics(event);
      }

      return true;
    } catch (error) {
      // A failed event is removed from the in-memory idempotency set so an
      // explicit retry can execute. Durable downstream idempotency is still
      // required for persisted/replayed events across processes.
      this.processedEventIds.delete(event.id);
      console.error("[EventPipeline] Error emitting event:", error);
      throw error;
    }
  }

  subscribe(eventType: EventType, handler: EventHandler): void {
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }
    this.subscriptions.get(eventType)!.push(handler);
  }

  unsubscribe(eventType: EventType, handler: EventHandler): void {
    const handlers = this.subscriptions.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) handlers.splice(index, 1);
    }
  }

  private addToHistory(event: UnifiedEvent): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  private trimProcessedIds(): void {
    if (this.processedEventIds.size <= this.maxProcessedIds) return;
    const keep = Array.from(this.processedEventIds).slice(-Math.floor(this.maxProcessedIds * 0.8));
    this.processedEventIds = new Set(keep);
  }

  getHistory(limit?: number): UnifiedEvent[] {
    if (limit) return this.eventHistory.slice(-limit);
    return [...this.eventHistory];
  }

  /** Persistence remains a deliberate extension point until the canonical event table contract is migrated. */
  private async persistEvent(_event: UnifiedEvent): Promise<void> {
    // TODO: wire to the canonical learning-events table with a UNIQUE(event_id)
    // constraint before claiming cross-process idempotency.
  }

  private async sendToCortex(_event: UnifiedEvent): Promise<void> {
    // CortexEventHandler is the canonical Cortex adapter. Keeping this hook
    // empty avoids dispatching the same event twice.
  }

  private async sendToAnalytics(_event: UnifiedEvent): Promise<void> {
    // AnalyticsEventHandler is the canonical analytics adapter. Keeping this
    // hook empty avoids duplicate analytics writes.
  }

  clearHistory(): void {
    this.eventHistory = [];
  }

  /** Test/support hook for resetting runtime idempotency state. */
  clearProcessedEventIds(): void {
    this.processedEventIds.clear();
  }

  updateConfig(config: Partial<EventPipelineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): EventPipelineConfig {
    return { ...this.config };
  }
}

export const eventPipeline = EventPipeline.getInstance();
