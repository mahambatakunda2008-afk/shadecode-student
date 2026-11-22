import { describe, expect, it } from "vitest";
import { mergeDeviceAndCloudLessons } from "./mergeDeviceAndCloudLessons";
import type { OfflineLesson } from "@/lib/offline/storage";

const deviceLesson = (overrides: Partial<OfflineLesson> = {}): OfflineLesson => ({
  id: "lesson-device", title: "Local lesson", subject: "Physics", description: "Saved locally",
  difficulty: "medium", progress: 35, completed: false, blocks: [{ type: "concept", content: "Cached content" }],
  downloadedAt: "2026-11-22T10:00:00.000Z", lastSyncedAt: "2026-11-22T10:00:00.000Z", size: 120,
  ...overrides,
});

describe("mergeDeviceAndCloudLessons", () => {
  it("preserves device-only lessons when the cloud list refreshes", () => {
    const result = mergeDeviceAndCloudLessons([], [deviceLesson()]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("lesson-device");
    expect(result[0].blocks?.[0].content).toBe("Cached content");
  });
  it("lets cloud metadata win without discarding downloaded lesson blocks", () => {
    const result = mergeDeviceAndCloudLessons([{
      id: "lesson-device", title: "Cloud title", subject: "Physics", subjectId: "subject-1",
      description: "Cloud description", difficulty: "hard", progress: 10, completed: false,
    }], [deviceLesson()]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Cloud title");
    expect(result[0].progress).toBe(10);
    expect(result[0].blocks?.[0].content).toBe("Cached content");
  });
  it("includes distinct cloud and device lessons exactly once", () => {
    const result = mergeDeviceAndCloudLessons([{
      id: "cloud-lesson", title: "Cloud lesson", subject: "Maths", subjectId: "s1",
      description: "", difficulty: "easy", progress: 0, completed: false,
    }], [deviceLesson()]);
    expect(result.map(lesson => lesson.id).sort()).toEqual(["cloud-lesson", "lesson-device"]);
  });
});
