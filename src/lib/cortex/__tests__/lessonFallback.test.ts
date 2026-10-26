import { describe, expect, it } from "vitest";
import { buildDeterministicLessonFallback } from "../lessonFallback";
import { lessonQualityFailures } from "../lessonQuality";

describe("deterministic lesson recovery", () => {
  it("returns a substantial authored Physics waves lesson when providers are unavailable", () => {
    const lesson = buildDeterministicLessonFallback("Physics 9702 AS Level", "Waves");

    expect(lesson).not.toBeNull();
    expect(lesson?.title).toContain("Waves");
    expect((lesson?.blocks.length ?? 0)).toBeGreaterThanOrEqual(14);
    expect(lesson?.blocks.some((block) => block.content.includes("v = fλ"))).toBe(true);
    expect(lesson?.blocks.some((block) => block.type === "example")).toBe(true);
    expect(lesson?.blocks.some((block) => block.type === "checkpoint")).toBe(true);
  });

  it("normalizes curriculum aliases and natural-language topic requests", () => {
    const byAlias = buildDeterministicLessonFallback("AS Physics", "Please teach me waves");
    const byCode = buildDeterministicLessonFallback("Physics (9702)", "Waves topic");

    expect(byAlias?.title).toContain("Waves");
    expect(byCode?.title).toContain("Waves");
  });


  it("provides a genuinely teachable coordinate geometry recovery lesson with worked answers and math notation", () => {
    const lesson = buildDeterministicLessonFallback("Mathematics", "Coordinate Geometry");

    expect(lesson).not.toBeNull();
    expect(lesson?.blocks.length).toBeGreaterThanOrEqual(14);
    expect(lesson?.blocks.some((block) => block.title === "Distance formula")).toBe(true);
    expect(lesson?.blocks.some((block) => block.content.includes("$m = \\frac{y_2-y_1}{x_2-x_1}$"))).toBe(true);
    expect(lesson?.blocks.some((block) => block.title === "Practice set with answers")).toBe(true);
    expect(lesson?.blocks.some((block) => block.title === "Exam-style question with full working")).toBe(true);
  });

  it("includes real visual blocks in authored lessons where diagrams materially help", () => {
    const coordinate = buildDeterministicLessonFallback("Mathematics", "Coordinate Geometry");
    const waves = buildDeterministicLessonFallback("Physics 9702 AS Level", "Waves");
    const forces = buildDeterministicLessonFallback("Physics", "Newton's laws of motion");
    const roots = buildDeterministicLessonFallback("Mathematics", "Numerical solution of equations");
    const trig = buildDeterministicLessonFallback("Mathematics", "Trigonometric identities");
    const binary = buildDeterministicLessonFallback("Computer Science", "Binary number systems");

    expect(coordinate?.blocks.some((block) => block.type === "diagram" && block.content === "coordinate-plane")).toBe(true);
    expect(waves?.blocks.some((block) => block.type === "diagram" && block.content === "wave-shape")).toBe(true);
    expect(forces?.blocks.some((block) => block.type === "diagram" && block.content === "force-pairs")).toBe(true);
    expect(roots?.blocks.some((block) => block.type === "diagram" && block.content === "root-bracket")).toBe(true);
    expect(trig?.blocks.some((block) => block.type === "diagram" && block.content === "unit-circle")).toBe(true);
    expect(binary?.blocks.some((block) => block.type === "diagram" && block.content === "binary-place-values")).toBe(true);
  });

  it("requires the relevant supported visual for visual-first teaching topics", () => {
    const request = {
      intent: "teach" as const,
      subject: "Mathematics",
      topic: "Coordinate Geometry",
      prompt: "Teach coordinate geometry",
      requestedParts: [],
    };
    const blocks = [
      { type: "objective", title: "Objective", content: "Learn coordinate geometry." },
      { type: "concept", title: "Gradient", content: "Gradient describes the slope of a line." },
      { type: "example", title: "Worked example", content: "Given: A(1,2) and B(3,4). Step 1: calculate the gradient. Answer: 1." },
      { type: "checkpoint", title: "Try it", content: "Question: Find the gradient of a line through two points. Think: subtract y-values and x-values." },
      { type: "summary", title: "Summary", content: "You should now be able to calculate a gradient." },
    ];

    expect(lessonQualityFailures({ title: "Coordinate Geometry", blocks }, request).failures).toContain("missing-relevant-diagram");
    expect(lessonQualityFailures({ title: "Coordinate Geometry", blocks: [...blocks, { type: "diagram", title: "Visualise gradient", content: "coordinate-plane" }] }, request).failures).not.toContain("missing-relevant-diagram");
    expect(lessonQualityFailures({ title: "Coordinate Geometry", blocks: [...blocks, { type: "diagram", title: "Unverified visual", content: "made-up-chart" }] }, request).failures).toContain("unsupported-diagram");

    const visualCases = [
      { subject: "Chemistry 9701", topic: "States of matter", key: "particle-model" },
      { subject: "Biology", topic: "Plant cell structure", key: "cell-structure" },
      { subject: "Computer Science 9618", topic: "Flowcharts and algorithms", key: "flowchart" },
      { subject: "Physics 9702", topic: "Series circuits", key: "series-circuit" },
    ];
    for (const visualCase of visualCases) {
      const subjectRequest = { ...request, subject: visualCase.subject, topic: visualCase.topic };
      expect(lessonQualityFailures({ title: visualCase.topic, blocks }, subjectRequest).failures).toContain("missing-relevant-diagram");
      const withVisual = [...blocks, { type: "diagram", title: "Relevant visual", content: visualCase.key }];
      expect(lessonQualityFailures({ title: visualCase.topic, blocks: withVisual }, subjectRequest).failures).not.toContain("missing-relevant-diagram");
    }
  });

  it("never crosses subject boundaries when a topic name overlaps", () => {
    expect(buildDeterministicLessonFallback("Computer Science", "Waves")).toBeNull();
    expect(buildDeterministicLessonFallback("Chemistry", "Waves")).toBeNull();
  });

  it("returns no invented fallback for an uncovered topic", () => {
    expect(buildDeterministicLessonFallback("Physics", "quantum field theory")).toBeNull();
  });
});
