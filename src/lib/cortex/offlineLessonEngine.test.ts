import { describe, expect, it } from "vitest";
import { buildOfflineLessonFromPack } from "./offlineLessonEngine";
import type { OfflineCurriculumPack } from "./offlineCurriculumPack";

function pack(withPractice = true): OfflineCurriculumPack {
  const objectiveIds = ["objective-waves"];
  const knowledge = [
    { id: "k1", kind: "concept", title: "Wave motion", content: "Wave motion transfers energy through oscillations without net transfer of matter.", objectiveIds },
    { id: "k2", kind: "worked_example", title: "Worked example: wave speed", content: "A wave has frequency 5 Hz and wavelength 2 m. Use v = fλ, substitute the values, then calculate v = 10 m/s.", objectiveIds },
    ...(withPractice ? [{ id: "k3", kind: "assessment_question", title: "Practice: calculate wave speed", content: "A wave has frequency 4 Hz and wavelength 3 m. Calculate its speed and show the equation and substitution.", objectiveIds }] : []),
  ];
  return {
    version: 2,
    subject: "Physics",
    objectives: [{ id: "objective-waves", code: "3.1", statement: "Understand wave motion and calculate wave speed." }],
    knowledge,
    cachedAt: "2026-11-27T00:00:00.000Z",
  };
}

describe("buildOfflineLessonFromPack", () => {
  it("builds an offline lesson when verified knowledge, a worked example and practice exist", () => {
    const lesson = buildOfflineLessonFromPack("Physics", "Teach me wave motion", "wave motion", pack());
    expect(lesson).not.toBeNull();
    expect(lesson?.blocks.some(block => block.type === "example")).toBe(true);
    expect(lesson?.blocks.some(block => block.type === "practice")).toBe(true);
    expect(lesson?.blocks.some(block => block.type === "checkpoint")).toBe(true);
  });

  it("refuses to present a list of notes as a complete lesson when verified practice is missing", () => {
    expect(buildOfflineLessonFromPack("Physics", "Teach me wave motion", "wave motion", pack(false))).toBeNull();
  });
});
