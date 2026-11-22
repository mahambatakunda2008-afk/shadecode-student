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

  it("still rejects runaway lessons past the 36-block server persist limit", () => {
    expect(failuresFor(37, { broadTopic: true, depth: "deep" })).toContain("too-many-blocks");
    expect(failuresFor(37, {})).toContain("too-many-blocks");
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

describe("long blocks and application phrasing", () => {
  const request = { intent: "teach", subject: "Physics", topic: "Electromagnetism", prompt: "Electromagnetism", requestedParts: [] } as never;
  const long = Array.from({ length: 16 }, (_, i) => `Electromagnetic induction sentence ${i} links changing flux to an induced emf in a loop.`).join(" ");

  it("splits a 1,100+ character paragraph into enough lines to pass the gate", () => {
    const [fixed] = breakUpLongParagraphs([{ type: "concept", title: "Induction", content: long }]);
    expect(long.length).toBeGreaterThan(1100);
    expect(lessonQualityFailures({ title: "Electromagnetism", blocks: [fixed] }, request).failures).not.toContain("wall-of-text");
  });

  it("accepts an application scenario phrased as a question", () => {
    const blocks = [{ type: "application", title: "Real use", content: "A student moves a magnet through a coil of wire at constant speed. What happens to the induced emf if the speed doubles, and why?" }];
    expect(lessonQualityFailures({ title: "Electromagnetism", blocks }, request).failures).not.toContain("empty-application");
  });
});

describe("empty-application", () => {
  const request = { intent: "teach", subject: "Physics", topic: "Electromagnetism", prompt: "Electromagnetism", requestedParts: [] } as never;
  const app = (content: string) => [{ type: "real_world", title: "Generators", content }];

  it("accepts an explanatory real-world block that sets no task", () => {
    const content = "Power station generators spin coils inside strong magnets so the flux through each coil keeps changing, which induces the alternating emf sent to homes.";
    expect(lessonQualityFailures({ title: "Electromagnetism", blocks: app(content) }, request).failures).not.toContain("empty-application");
  });

  it("still rejects an empty or placeholder application block", () => {
    expect(lessonQualityFailures({ title: "Electromagnetism", blocks: app("TBD") }, request).failures).toContain("empty-application");
    expect(lessonQualityFailures({ title: "Electromagnetism", blocks: app("Short.") }, request).failures).toContain("empty-application");
  });
});

import { isSectionTooThin } from "./lessonQuality";

describe("isSectionTooThin", () => {
  it("rejects sections under 3 blocks only in multi-section lessons", () => {
    expect(isSectionTooThin(2, 7)).toBe(true);
    expect(isSectionTooThin(3, 7)).toBe(false);
    expect(isSectionTooThin(1, 1)).toBe(false);
  });
});

describe("wall-of-text ignores non-prose blocks", () => {
  const request = { intent: "teach", subject: "Physics", topic: "Circular motion", prompt: "Circular motion", requestedParts: [] } as never;
  const figure = `<svg viewBox="0 0 200 200">${"<circle cx='100' cy='100' r='40'/>".repeat(40)}</svg>`;

  it("does not flag a long single-line diagram", () => {
    expect(figure.length).toBeGreaterThan(1100);
    expect(lessonQualityFailures({ title: "Circular motion", blocks: [{ type: "diagram", title: "Diagram", content: figure }] }, request).failures).not.toContain("wall-of-text");
  });
  it("still flags a long single-line prose block", () => {
    expect(lessonQualityFailures({ title: "Circular motion", blocks: [{ type: "concept", title: "Idea", content: "word ".repeat(300) }] }, request).failures).toContain("wall-of-text");
  });
});

import { parseSectionJson } from "./lessonJson";

describe("parseSectionJson", () => {
  const block = (type: string, content: string) => ({ type, title: type, content });
  const long = "A sufficiently long block of explanatory content about the topic at hand.";

  it("keeps all eight blocks of a final section so the closing summary survives", () => {
    const blocks = ["concept", "example", "checkpoint", "curiosity", "practice", "exam", "mistake", "summary"].map((t) => block(t, long));
    const parsed = parseSectionJson(JSON.stringify({ title: "Final", blocks }));
    expect(parsed?.blocks.map((b: { type: string }) => b.type).at(-1)).toBe("summary");
    expect(parsed?.blocks).toHaveLength(8);
  });

  it("keeps a short checkpoint question and tolerates a missing title", () => {
    const blocks = [block("concept", long), block("example", long), block("checkpoint", "What is the SI unit of force?")];
    const parsed = parseSectionJson(JSON.stringify({ blocks }));
    expect(parsed?.blocks).toHaveLength(3);
    expect(parsed?.title).toBe("");
  });

  it("still rejects a section with fewer than 3 usable blocks", () => {
    expect(parseSectionJson(JSON.stringify({ title: "x", blocks: [block("concept", long), block("example", "too short")] }))).toBeNull();
  });
});

describe("block ceiling matches the server persist limit", () => {
  it("accepts 29 blocks for a topic that is not flagged broad but rejects past 36", () => {
    expect(failuresFor(29, {})).not.toContain("too-many-blocks");
    expect(failuresFor(37, {})).toContain("too-many-blocks");
  });
});

import { missingSectionTypes, requiredSectionTypes } from "./lessonQuality";

describe("required block types per section", () => {
  it("places the deep-lesson stages across a seven-section lesson", () => {
    const all = Array.from({ length: 7 }, (_, i) => requiredSectionTypes(i, 7)).flat();
    for (const type of ["objective", "map", "structure", "mechanism", "synthesis", "curiosity", "practice", "mistake", "summary"]) expect(all).toContain(type);
    expect(requiredSectionTypes(0, 7)).toEqual(["objective", "map"]);
    expect(requiredSectionTypes(6, 7)).toEqual(["curiosity", "practice", "mistake", "summary"]);
  });
  it("requires nothing for a single-section lesson and still covers short plans", () => {
    expect(requiredSectionTypes(0, 1)).toEqual([]);
    const four = Array.from({ length: 4 }, (_, i) => requiredSectionTypes(i, 4)).flat();
    for (const type of ["map", "structure", "mechanism", "synthesis", "curiosity"]) expect(four).toContain(type);
  });
  it("reports only the missing types, honouring aliases", () => {
    expect(missingSectionTypes(["concept", "objective"], 0, 7)).toEqual(["map"]);
    expect(missingSectionTypes(["recap", "curiosity", "practice", "mistake"], 6, 7)).toEqual([]);
  });
});

describe("wall-of-text false positives", () => {
  const request = { intent: "teach", subject: "Physics", topic: "Waves", prompt: "Waves", requestedParts: [] } as never;
  it("does not flag a long bulleted list that has no sentence punctuation", () => {
    const list = Array.from({ length: 8 }, (_, i) => `- Wave property number ${i} with its symbol and unit`).join("\n");
    expect(list.length).toBeGreaterThan(260);
    expect(lessonQualityFailures({ title: "Waves", blocks: [{ type: "concept", title: "Properties", content: list }] }, request).failures).not.toContain("wall-of-text");
  });
});
