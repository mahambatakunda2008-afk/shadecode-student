import { describe, expect, it } from "vitest";
import { lessonQualityFailures } from "./lessonQuality";

const blocks = (count: number) => Array.from({ length: count }, (_, i) => ({ type: "concept", title: `Kinematics idea ${i}`, content: `Kinematics idea ${i} explains motion with a distinct point number ${i}.` }));
const failuresFor = (count: number, request: Record<string, unknown>) =>
  lessonQualityFailures({ title: "Kinematics", blocks: blocks(count) }, { intent: "teach", subject: "Physics", topic: "Kinematics", prompt: "Kinematics", requestedParts: [], ...request } as never).failures;

describe("lesson block cap", () => {
  it("accepts the 30-32 blocks that six assembled deep sections produce", () => {
    for (const count of [30, 32, 36]) expect(failuresFor(count, { broadTopic: true, depth: "deep" })).not.toContain("too-many-blocks");
  });

  it("still rejects runaway broad lessons and long ordinary lessons", () => {
    expect(failuresFor(37, { broadTopic: true, depth: "deep" })).toContain("too-many-blocks");
    expect(failuresFor(19, {})).toContain("too-many-blocks");
  });
});
