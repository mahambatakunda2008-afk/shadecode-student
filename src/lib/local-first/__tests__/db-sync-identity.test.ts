import { describe, expect, it } from "vitest";
import { matchesLocalEntityIdentity } from "../db";

describe("local-first sync entity identity", () => {
  it("matches progress by lesson id when the storage key is user-scoped", () => {
    const progress = {
      id: "progress:user-a:lesson-1",
      entity: "progress" as const,
      userId: "user-a",
      payload: { lessonId: "lesson-1", userId: "user-a", progress: 60 },
    };
    expect(matchesLocalEntityIdentity(progress, "progress", "lesson-1")).toBe(true);
    expect(matchesLocalEntityIdentity(progress, "progress", "lesson-2")).toBe(false);
  });

  it("matches records by their explicit domain entity id", () => {
    const task = {
      id: "local-record-1",
      entity: "task" as const,
      entityId: "task-1",
      userId: "user-a",
      payload: {},
    };
    expect(matchesLocalEntityIdentity(task, "task", "task-1")).toBe(true);
  });

  it("preserves compatibility with older records without entityId", () => {
    const subject = {
      id: "subject-1",
      entity: "subject" as const,
      userId: "user-a",
      payload: {},
    };
    expect(matchesLocalEntityIdentity(subject, "subject", "subject-1")).toBe(true);
  });

  it("never matches an entity owned by a different entity type", () => {
    const task = {
      id: "task-1",
      entity: "task" as const,
      userId: "user-a",
      payload: {},
    };
    expect(matchesLocalEntityIdentity(task, "subject", "task-1")).toBe(false);
  });
});
