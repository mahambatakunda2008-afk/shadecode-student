import { describe, expect, it } from "vitest";
import { isResumableDurableLessonJob } from "./lessonGenerationClient";

const now = Date.parse("2026-11-21T12:00:00Z");
const base = { kind: "lesson", request: { topic: "Dynamics" }, status: "generating", created_at: "2026-11-21T11:30:00Z", updated_at: "2026-11-21T11:59:00Z" };

describe("isResumableDurableLessonJob", () => {
  it("resumes a recent unfinished lesson job", () => expect(isResumableDurableLessonJob(base, now)).toBe(true));
  it("ignores an old job even when repeated resumes keep bumping updated_at", () => expect(isResumableDurableLessonJob({ ...base, created_at: "2026-11-20T11:30:00Z", updated_at: "2026-11-21T11:59:00Z" }, now)).toBe(false));
  it("ignores failed, complete and cancelled jobs", () => {
    for (const status of ["failed", "complete", "cancelled"]) expect(isResumableDurableLessonJob({ ...base, status }, now)).toBe(false);
  });
  it("ignores non-lesson jobs and jobs without a request", () => {
    expect(isResumableDurableLessonJob({ ...base, kind: "exam" }, now)).toBe(false);
    expect(isResumableDurableLessonJob({ ...base, request: null }, now)).toBe(false);
  });
});
