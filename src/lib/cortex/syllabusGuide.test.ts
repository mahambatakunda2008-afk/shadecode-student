import { describe, expect, it } from "vitest";
import { buildSyllabusGuide, selfTestPrompt, type GuideKnowledgeItem } from "./syllabusGuide";

const scope = (code: string, title: string): GuideKnowledgeItem => ({ kind: "content_scope", code: `scope|${code}`, title, topicCode: code });
const outcome = (code: string, n: number, content: string): GuideKnowledgeItem => ({ kind: "learning_outcome", code: `outcome|${code}|${n}`, title: `${code}: outcome ${n}`, content, topicCode: code });

// Real AS Physics 9702 wording for the Waves chapter, plus a second chapter that must not leak in.
const ITEMS: GuideKnowledgeItem[] = [
  scope("7.1", "Progressive waves"), scope("7.2", "Transverse and longitudinal waves"), scope("7.3", "Doppler effect for sound waves"), scope("7.10", "Wave summary"), scope("8.1", "Stationary waves"),
  outcome("7.1", 1, "Describe wave motion as illustrated by vibrations in ropes, springs and ripple tanks."),
  outcome("7.1", 2, "Understand and use the terms displacement, amplitude, phase difference, period, frequency, wavelength and speed."),
  outcome("7.1", 3, "Understand how the time-base and y-gain of a cathode-ray oscilloscope (CRO) are used to determine frequency and amplitude."),
  outcome("7.1", 4, "Recall and use v = fλ."),
  outcome("7.1", 5, "Derive the equation v = fλ."),
  outcome("7.2", 1, "Describe and distinguish between transverse and longitudinal waves."),
  outcome("7.2", 2, "Understand that polarisation is evidence for the transverse nature of electromagnetic waves."),
  outcome("7.2", 3, "State that the intensity of a wave is proportional to the square of its amplitude."),
  outcome("7.3", 1, "Understand that the observed frequency changes when a source of sound moves relative to an observer."),
  outcome("7.3", 2, "Use the expression fo = fsv / (v ± vs) for the observed frequency."),
  outcome("7.10", 1, "State the relationship between speed, frequency and wavelength for all waves."),
  outcome("8.1", 1, "Explain the formation of a stationary wave using a graphical method."),
];

describe("buildSyllabusGuide", () => {
  it("builds an honest guide from the matched subsection and the rest of its chapter", () => {
    const guide = buildSyllabusGuide({ subject: "AS Level Physics", topic: "Waves", matchedTopicCodes: ["7.1"], items: ITEMS })!;
    expect(guide).not.toBeNull();
    expect(guide.title).toBe("Syllabus guide: Waves");
    expect(guide.blocks.length).toBeGreaterThanOrEqual(10);
    expect(guide.blocks[0].type).toBe("objective");
    expect(guide.blocks[0].content).toMatch(/AI lesson generation is unavailable/);
    expect(guide.blocks[0].content).toMatch(/no worked examples/i);
    expect(guide.blocks.at(-1)!.type).toBe("summary");
  });

  it("stays inside the syllabus chapter: another chapter's content never appears", () => {
    const guide = buildSyllabusGuide({ subject: "Physics", topic: "Waves", matchedTopicCodes: ["7.1"], items: ITEMS })!;
    const text = guide.blocks.map((b) => b.content).join("\n");
    expect(text).not.toMatch(/stationary wave/i);
  });

  it("orders subsections numerically (7.2 before 7.10) with the matched subsection first", () => {
    const guide = buildSyllabusGuide({ subject: "Physics", topic: "Waves", matchedTopicCodes: ["7.1"], items: ITEMS })!;
    const titles = guide.blocks.filter((b) => b.type === "concept").map((b) => b.title);
    const idx = (needle: string) => titles.findIndex((t) => t.startsWith(needle));
    expect(idx("Progressive waves")).toBe(0);
    expect(idx("Transverse and longitudinal waves")).toBeLessThan(idx("Wave summary"));
  });

  it("invents nothing: every listed outcome is verbatim syllabus text", () => {
    const guide = buildSyllabusGuide({ subject: "Physics", topic: "Waves", matchedTopicCodes: ["7.1"], items: ITEMS })!;
    const source = new Set(ITEMS.filter((i) => i.kind === "learning_outcome").map((i) => (i.content ?? "").replace(/\.$/, "")));
    for (const block of guide.blocks.filter((b) => b.type === "concept")) {
      const lines = block.content.split("\n").slice(1);
      for (const line of lines) expect(source.has(line.replace(/^\d+\.\s*/, "").replace(/\.$/, "")), line).toBe(true);
    }
  });

  it("makes every block long enough to persist (40+ characters) and uses supported block types", () => {
    const guide = buildSyllabusGuide({ subject: "Physics", topic: "Waves", matchedTopicCodes: ["7.1"], items: ITEMS })!;
    for (const b of guide.blocks) {
      expect(b.content.trim().length, b.title).toBeGreaterThanOrEqual(40);
      expect(["objective", "concept", "checkpoint", "exam", "summary"]).toContain(b.type);
    }
  });

  it("returns null instead of padding when the syllabus gives too little", () => {
    const thin = [scope("1.1", "Only topic"), outcome("1.1", 1, "Describe the structure of a cell.")];
    expect(buildSyllabusGuide({ subject: "Biology", topic: "Cells", matchedTopicCodes: ["1.1"], items: thin })).toBeNull();
  });

  it("returns null when the topic did not resolve to any subsection with outcomes", () => {
    expect(buildSyllabusGuide({ subject: "Physics", topic: "Waves", matchedTopicCodes: ["99.9"], items: ITEMS })).toBeNull();
    expect(buildSyllabusGuide({ subject: "Physics", topic: "Waves", matchedTopicCodes: [], items: ITEMS })).toBeNull();
  });

  it("splits long outcome lists evenly instead of leaving a one-line block", () => {
    const guide = buildSyllabusGuide({ subject: "Physics", topic: "Waves", matchedTopicCodes: ["7.1"], items: ITEMS })!;
    const parts = guide.blocks.filter((b) => b.title.startsWith("Progressive waves: what you must know"));
    expect(parts).toHaveLength(2);
    expect(parts.map((b) => b.content.split("\n").length - 1)).toEqual([3, 2]);
    expect(parts[1].content).toContain("4. ");
  });

  it("names subsections from outcome titles when a syllabus has no scope rows (Biology)", () => {
    const bio: GuideKnowledgeItem[] = [];
    for (const [code, name] of [["3.1", "Enzymes"], ["3.2", "Cell membranes"], ["3.3", "Transport"], ["3.4", "Digestion"]] as const) {
      for (let n = 1; n <= 3; n++) bio.push({ kind: "learning_outcome", code: `outcome|${code}|${n}`, title: `${name}: outcome ${n}`, content: `Describe biological idea ${n} of ${name.toLowerCase()} in full.`, topicCode: code });
    }
    const guide = buildSyllabusGuide({ subject: "Biology", topic: "Enzymes", matchedTopicCodes: ["3.1"], items: bio })!;
    const titles = guide.blocks.filter((b) => b.type === "concept").map((b) => b.title);
    expect(titles[0]).toBe("Enzymes: what you must know");
    expect(titles.join(" ")).not.toMatch(/Subsection 3/);
  });
  it("prefers a real scope title over one recovered from an outcome", () => {
    const items: GuideKnowledgeItem[] = [
      { kind: "learning_outcome", code: "outcome|1.1|1", title: "Old name: outcome 1", content: "Describe the first idea of this subsection.", topicCode: "1.1" },
      scope("1.1", "Official name"),
    ];
    // Too thin for a guide, so inspect through a wider fixture: same subsection plus siblings.
    const wide = [...items, ...[2, 3, 4].flatMap((k) => [scope(`1.${k}`, `Sub ${k}`), ...[1, 2, 3, 4].map((n) => outcome(`1.${k}`, n, `Describe idea ${n} of sub ${k} of this chapter fully.`))])];
    const guide = buildSyllabusGuide({ subject: "Biology", topic: "Anything", matchedTopicCodes: ["1.1"], items: wide })!;
    expect(guide.blocks.find((b) => b.type === "concept")!.title).toMatch(/^Official name/);
  });

  it("counts real extra blocks toward the floor and updates the honesty note", () => {
    const thin = [scope("1.1", "Only"), scope("1.2", "Second"), outcome("1.1", 1, "Describe the structure of a cell."), outcome("1.2", 1, "State the function of the nucleus.")];
    const base = { subject: "Maths", topic: "Quadratics", matchedTopicCodes: ["1.1"], items: thin };
    expect(buildSyllabusGuide(base)).toBeNull();
    const extra = Array.from({ length: 6 }, (_, i) => ({ type: "example", title: `Worked example ${i + 1}`, content: `A real computed worked example number ${i + 1} with full working.` }));
    const guide = buildSyllabusGuide({ ...base, extraBlocks: extra })!;
    expect(guide.blocks.length).toBeGreaterThanOrEqual(10);
    expect(guide.blocks[0].content).toMatch(/worked examples and practice with answers/i);
    expect(guide.blocks[0].content).not.toMatch(/no worked examples/i);
    const idx = guide.blocks.findIndex((b) => b.type === "example");
    expect(idx).toBeGreaterThan(0);
    expect(guide.blocks[guide.blocks.length - 2].type).toBe("exam");
  });

  it("caps the guide at six subsections", () => {
    const many: GuideKnowledgeItem[] = [];
    for (let i = 1; i <= 9; i++) { many.push(scope(`3.${i}`, `Sub ${i}`)); for (let n = 1; n <= 3; n++) many.push(outcome(`3.${i}`, n, `Describe the idea number ${n} in subsection ${i} of this chapter.`)); }
    const guide = buildSyllabusGuide({ subject: "Chemistry", topic: "Chapter 3", matchedTopicCodes: ["3.1"], items: many })!;
    expect(guide.blocks.filter((b) => b.type === "checkpoint")).toHaveLength(6);
  });
});

describe("selfTestPrompt", () => {
  it("frames understand-style outcomes as explain-in-your-own-words", () => {
    expect(selfTestPrompt("Understand that polarisation is evidence for the transverse nature of electromagnetic waves.")).toBe("Explain in your own words: polarisation is evidence for the transverse nature of electromagnetic waves.");
  });
  it("turns recall-and-use formulas into write-it-down then use-it", () => {
    expect(selfTestPrompt("Recall and use λ = h/p.")).toBe("Write down λ = h/p from memory, then use it in a short worked calculation.");
  });
  it("keeps describe/state outcomes as direct prompts", () => {
    expect(selfTestPrompt("Describe wave motion as illustrated by vibrations in ropes.")).toBe("Describe wave motion as illustrated by vibrations in ropes.");
  });
  it("keeps compound outcomes grammatical instead of mangling them", () => {
    expect(selfTestPrompt("Understand and use the terms displacement, amplitude and period.")).toBe("Test yourself: Understand and use the terms displacement, amplitude and period.");
  });
  it("asks for full working on calculation verbs and falls back safely for unknown verbs", () => {
    expect(selfTestPrompt("Calculate the speed of the wave.")).toBe("Show full working: Calculate the speed of the wave.");
    expect(selfTestPrompt("Photoelectric effect basics")).toBe("Test yourself: Photoelectric effect basics.");
    expect(selfTestPrompt("")).toBe("");
  });
});
