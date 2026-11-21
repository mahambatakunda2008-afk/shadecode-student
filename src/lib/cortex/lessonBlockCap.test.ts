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

import { ensureRequiredDiagram, requiredDiagramFor } from "./lessonQuality";

describe("required diagram", () => {
  const request = { topic: "Waves", subject: "Physics" };
  const concept = (n: number) => ({ type: "concept", title: `c${n}`, content: `Concept ${n} about waves and how they carry energy without carrying matter along.` });

  it("maps topics to their built-in diagram", () => {
    expect(requiredDiagramFor(request)).toBe("wave-shape");
    expect(requiredDiagramFor({ topic: "Kinematics", subject: "Physics" })).toBeNull();
  });

  it("adds the diagram after the opening blocks when the model omitted it", () => {
    const out = ensureRequiredDiagram([concept(1), concept(2), concept(3), concept(4)], request);
    expect(out).toHaveLength(5);
    expect(out[3]).toMatchObject({ type: "diagram", content: "wave-shape" });
  });

  it("keeps an existing correct diagram and replaces an unsupported one", () => {
    const withDiagram = [concept(1), { type: "diagram", title: "d", content: "wave-shape" }, concept(2)];
    expect(ensureRequiredDiagram(withDiagram, request)).toBe(withDiagram);
    const wrong = ensureRequiredDiagram([concept(1), { type: "diagram", title: "d", content: "made-up" }, concept(2)], request);
    expect(wrong.filter(block => block.type === "diagram")).toEqual([{ type: "diagram", title: "Diagram", content: "wave-shape" }]);
  });

  it("does nothing for topics with no required diagram", () => {
    const blocks = [concept(1), concept(2)];
    expect(ensureRequiredDiagram(blocks, { topic: "Kinematics", subject: "Physics" })).toBe(blocks);
  });
});

describe("broad topic drift", () => {
  const request = { intent: "teach", subject: "Physics", topic: "Electricity", prompt: "Electricity", requestedParts: [], broadTopic: true, depth: "deep" } as never;
  const mixed = (anchored: number) => Array.from({ length: 22 }, (_, i) => ({
    type: "concept",
    title: i < anchored ? `Electricity idea ${i}` : `Current and voltage idea ${i}`,
    content: i < anchored ? `Electricity moves charge, point ${i}.` : `Charge flow and potential difference, point ${i}.`,
  }));

  it("accepts a broad lesson whose sub-sections only sometimes repeat the topic word", () => {
    expect(lessonQualityFailures({ title: "Electricity", blocks: mixed(4) }, request).failures).not.toContain("topic-drift");
  });

  it("still rejects a broad lesson that almost never mentions the topic", () => {
    expect(lessonQualityFailures({ title: "Electricity", blocks: mixed(2) }, request).failures).toContain("topic-drift");
  });
});

import { breakUpLongParagraphs } from "./lessonQuality";

describe("breakUpLongParagraphs", () => {
  const dense = Array.from({ length: 9 }, (_, i) => `Radioactive decay sentence number ${i} explains one idea about nuclei and rates.`).join(" ");
  const request = { intent: "teach", subject: "Physics", topic: "Radioactivity", prompt: "Radioactivity", requestedParts: [] } as never;

  it("turns a dense single paragraph into short paragraphs that pass the wall-of-text check", () => {
    const before = lessonQualityFailures({ title: "Radioactivity", blocks: [{ type: "concept", title: "Decay", content: dense }] }, request).failures;
    expect(before).toContain("wall-of-text");
    const [fixed] = breakUpLongParagraphs([{ type: "concept", title: "Decay", content: dense }]);
    expect(fixed.content.split(/\n\n/).length).toBeGreaterThan(2);
    expect(fixed.content.replace(/\s+/g, " ")).toBe(dense);
    expect(lessonQualityFailures({ title: "Radioactivity", blocks: [fixed] }, request).failures).not.toContain("wall-of-text");
  });

  it("leaves short or already structured content alone", () => {
    const blocks = [{ content: "Short block." }, { content: `${dense}\n- a\n- b` }];
    expect(breakUpLongParagraphs(blocks)).toEqual(blocks);
  });
});
