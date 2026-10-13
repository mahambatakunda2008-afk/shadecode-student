import { describe, expect, it } from "vitest";
import { hasCompletedLessonCheckpoint } from "./lessonCheckpoint";

describe("hasCompletedLessonCheckpoint", () => {
  it("rejects a missing checkpoint", () => expect(hasCompletedLessonCheckpoint(undefined)).toBe(false));
  it("rejects an initial zero-section marker", () => expect(hasCompletedLessonCheckpoint({ completedUnits: 0, blocks: [] })).toBe(false));
  it("rejects completed units without blocks", () => expect(hasCompletedLessonCheckpoint({ completedUnits: 1, blocks: [] })).toBe(false));
  it("accepts saved content from a completed section", () => expect(hasCompletedLessonCheckpoint({ completedUnits: 1, blocks: [{ content: "saved" }] })).toBe(true));
  it("rejects invalid unit counts", () => expect(hasCompletedLessonCheckpoint({ completedUnits: -1, blocks: [{ content: "saved" }] })).toBe(false));
});
