import { describe, expect, it } from "vitest";
import { EventPipeline } from "./EventPipeline";
import type { LessonStartedEvent } from "./types";

describe("EventPipeline idempotency", () => {
  it("dispatches the same event id only once", async () => {
    const pipeline = EventPipeline.getInstance({
      enablePersistence: false,
      enableRealtime: false,
      enableAnalytics: false,
      enableCortex: false,
      enableAchievements: false,
      enableRecommendations: false,
    });
    pipeline.clearHistory();
    pipeline.clearProcessedEventIds();

    let calls = 0;
    const handler = {
      priority: 1,
      handle: async () => {
        calls += 1;
      },
    };

    pipeline.subscribe("lesson_started", handler);

    const event: LessonStartedEvent = {
      id: "event-replay-test-1",
      userId: "user-a",
      type: "lesson_started",
      timestamp: "2026-08-19T00:00:00.000Z",
      source: "test",
      data: {
        lessonId: "lesson-1",
        lessonTitle: "Test lesson",
        subject: "Mathematics",
      },
    };

    await expect(pipeline.emit(event)).resolves.toBe(true);
    await expect(pipeline.emit(event)).resolves.toBe(false);
    expect(calls).toBe(1);

    pipeline.unsubscribe("lesson_started", handler);
    pipeline.clearProcessedEventIds();
  });

  it("requires an authenticated user id on every event", async () => {
    const pipeline = EventPipeline.getInstance({
      enablePersistence: false,
      enableRealtime: false,
      enableAnalytics: false,
      enableCortex: false,
      enableAchievements: false,
      enableRecommendations: false,
    });

    const event = {
      id: "missing-user",
      userId: "",
      type: "lesson_started",
      timestamp: new Date().toISOString(),
      source: "test",
      data: {
        lessonId: "lesson-1",
        lessonTitle: "Test lesson",
        subject: "Mathematics",
      },
    } as LessonStartedEvent;

    await expect(pipeline.emit(event)).rejects.toThrow("userId");
  });
});
