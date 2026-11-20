import { describe, expect, it } from "vitest";
import { lessonQualityFailures } from "./lessonQuality";

const blocks = (count: number) => Array.from({ length: count }, (_, i) => ({ type: "concept", title: `Kinematics idea ${i}`, content: `Kinematics idea ${i} explains motion with a distinct point number ${i}.` }));
const failuresFor = (count: number, request: Record<string, unknown>) =>
  lessonQualityFailures({ title: "Kinematics", blocks: blocks(count) }, { intent: "teach", subject: "Physics", topic: "Kinematics", prompt: "Kinematics", requestedParts: [], ...request } as never).failures;

describe("lesson block cap", () => {
  it("accepts the 21-24 blocks that four assembled sections produce for a non-broad topic", () => {
    for (const count of [21, 24]) expect(failuresFor(count, {})).not.toContain("too-many-blocks");
  });

  it("accepts the 30-32 blocks that six assembled deep sections produce", () => {
    for (const count of [30, 32, 36]) expect(failuresFor(count, { broadTopic: true, depth: "deep" })).not.toContain("too-many-blocks");
  });

  it("still rejects runaway broad lessons and ordinary lessons beyond four sections", () => {
    expect(failuresFor(37, { broadTopic: true, depth: "deep" })).toContain("too-many-blocks");
    expect(failuresFor(25, {})).toContain("too-many-blocks");
  });
});

import { hasRequiredLessonStructure } from "./lessonQuality";

describe("server lesson contract structure", () => {
  const full = ["objective", "concept", "example", "checkpoint", "exam", "mistake", "summary"];
  it("accepts the strict names", () => {
    expect(hasRequiredLessonStructure(new Set(full))).toBe(true);
  });
  it("accepts practice for exam and misconception for mistake", () => {
    const types = new Set(full.filter(type => type !== "exam" && type !== "mistake").concat(["practice", "misconception"]));
    expect(hasRequiredLessonStructure(types)).toBe(true);
  });
  it("still rejects a lesson with no exam practice, no mistake or no summary", () => {
    for (const missing of ["exam", "mistake", "summary", "objective"]) {
      expect(hasRequiredLessonStructure(new Set(full.filter(type => type !== missing)))).toBe(false);
    }
  });
});
