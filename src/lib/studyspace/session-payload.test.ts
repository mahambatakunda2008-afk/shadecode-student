import { describe, expect, it } from "vitest";
import { createPersistedSession, updatePersistedSession } from "./session-payload";

const work = {
  id: "exam:demo",
  mode: "exam" as const,
  subject: "Physics",
  topic: "Mechanics",
  createdAt: "2026-08-23T10:00:00.000Z",
  updatedAt: "2026-08-23T10:00:00.000Z",
  response: "answer",
};

describe("StudySpace persisted session payload", () => {
  it("keeps work and session under the same workId", () => {
    const persisted = createPersistedSession(work, "exam", 900000);
    expect(persisted.session.workId).toBe(work.id);
    expect(persisted.work.id).toBe(work.id);
    expect(persisted.session.remainingMs).toBe(900000);
  });

  it("updates work and session atomically at the payload level", () => {
    const persisted = createPersistedSession(work, "exam", 900000);
    const next = updatePersistedSession(persisted, {
      response: "updated answer",
      remainingMs: 840000,
      status: "paused",
    });

    expect(next.work.response).toBe("updated answer");
    expect(next.session.status).toBe("paused");
    expect(next.session.remainingMs).toBe(840000);
    expect(next.work.updatedAt).toBe(next.session.updatedAt);
  });
});
