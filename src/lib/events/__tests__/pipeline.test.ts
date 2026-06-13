/**
 * /lib/events/__tests__/pipeline.test.ts
 *
 * Unified Event Pipeline - Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { EventPipeline } from "../EventPipeline";
import {
  LessonCompletedEvent,
  ExamCompletedEvent,
  StudySessionFinishedEvent,
} from "../types";

describe("EventPipeline", () => {
  let pipeline: EventPipeline;

  beforeEach(() => {
    pipeline = EventPipeline.getInstance();
    pipeline.clearHistory();
  });

  it("should emit and route events to handlers", async () => {
    const mockHandler = {
      handle: vi.fn(),
      priority: 1,
    };

    pipeline.subscribe("lesson_completed", mockHandler);

    const event: LessonCompletedEvent = {
      id: "test-1",
      userId: "user-1",
      type: "lesson_completed",
      timestamp: new Date().toISOString(),
      source: "test",
      data: {
        lessonId: "lesson-1",
        lessonTitle: "Test Lesson",
        subject: "Math",
        progress: 100,
        timeSpent: 30,
        attempts: 1,
      },
    };

    await pipeline.emit(event);

    expect(mockHandler.handle).toHaveBeenCalledWith(event);
  });

  it("should maintain event history", async () => {
    const event: ExamCompletedEvent = {
      id: "test-2",
      userId: "user-1",
      type: "exam_completed",
      timestamp: new Date().toISOString(),
      source: "test",
      data: {
        examId: "exam-1",
        subject: "Math",
        score: 85,
        totalMarks: 100,
        grade: "A",
        weakAreas: [],
        strongAreas: [],
        timeSpent: 60,
      },
    };

    await pipeline.emit(event);

    const history = pipeline.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe("test-2");
  });

  it("should execute handlers in priority order", async () => {
    const executionOrder: number[] = [];

    const handler1 = {
      handle: vi.fn(async () => {
        executionOrder.push(1);
      }),
      priority: 3,
    };

    const handler2 = {
      handle: vi.fn(async () => {
        executionOrder.push(2);
      }),
      priority: 1,
    };

    const handler3 = {
      handle: vi.fn(async () => {
        executionOrder.push(3);
      }),
      priority: 2,
    };

    pipeline.subscribe("study_session_finished", handler1);
    pipeline.subscribe("study_session_finished", handler2);
    pipeline.subscribe("study_session_finished", handler3);

    const event: StudySessionFinishedEvent = {
      id: "test-3",
      userId: "user-1",
      type: "study_session_finished",
      timestamp: new Date().toISOString(),
      source: "test",
      data: {
        sessionId: "session-1",
        subject: "Math",
        activityType: "lesson",
        duration: 30,
        xpEarned: 50,
        activities: [],
      },
    };

    await pipeline.emit(event);

    expect(executionOrder).toEqual([2, 3, 1]);
  });

  it("should allow unsubscribing handlers", async () => {
    const mockHandler = {
      handle: vi.fn(),
      priority: 1,
    };

    pipeline.subscribe("lesson_completed", mockHandler);
    pipeline.unsubscribe("lesson_completed", mockHandler);

    const event: LessonCompletedEvent = {
      id: "test-4",
      userId: "user-1",
      type: "lesson_completed",
      timestamp: new Date().toISOString(),
      source: "test",
      data: {
        lessonId: "lesson-1",
        lessonTitle: "Test Lesson",
        subject: "Math",
        progress: 100,
        timeSpent: 30,
        attempts: 1,
      },
    };

    await pipeline.emit(event);

    expect(mockHandler.handle).not.toHaveBeenCalled();
  });

  it("should limit event history size", async () => {
    const maxHistorySize = 1000;

    for (let i = 0; i < maxHistorySize + 10; i++) {
      const event: LessonCompletedEvent = {
        id: `test-${i}`,
        userId: "user-1",
        type: "lesson_completed",
        timestamp: new Date().toISOString(),
        source: "test",
        data: {
          lessonId: `lesson-${i}`,
          lessonTitle: `Test Lesson ${i}`,
          subject: "Math",
          progress: 100,
          timeSpent: 30,
          attempts: 1,
        },
      };

      await pipeline.emit(event);
    }

    const history = pipeline.getHistory();
    expect(history.length).toBeLessThanOrEqual(maxHistorySize);
  });
});
