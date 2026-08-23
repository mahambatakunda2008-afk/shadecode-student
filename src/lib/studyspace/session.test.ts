import { describe, expect, it } from "vitest";
import { createStudySession } from "./session";

describe("StudySpace sessions", () => {
  it("creates an active resumable session", () => {
    const session = createStudySession("exam:1", "exam", 60000);
    expect(session).toMatchObject({ workId: "exam:1", mode: "exam", status: "active", remainingMs: 60000 });
    expect(session.startedAt).toBeTruthy();
    expect(session.updatedAt).toBeTruthy();
  });
});
