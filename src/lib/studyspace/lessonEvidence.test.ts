import { describe, expect, it } from "vitest";
import { lessonWorkObject } from "./lessonEvidence";

describe("lesson evidence", () => {
  it("creates deterministic lesson work IDs", () => {
    const work = lessonWorkObject({
      lessonId: "lesson-42",
      subject: "Physics",
      topic: "Oscillations",
      progress: 100,
      createdAt: "2026-08-22T18:00:00.000Z",
    });
    expect(work.id).toBe("lesson:lesson-42");
    expect(work.mode).toBe("lesson");
    expect(work.status).toBe("submitted");
    expect(work.subject).toBe("Physics");
    expect(work.topic).toBe("Oscillations");
  });

  it("keeps incomplete lessons as drafts", () => {
    const work = lessonWorkObject({ lessonId: "lesson-7", progress: 60 });
    expect(work.status).toBe("draft");
  });
});
