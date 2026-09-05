import { describe, expect, it } from "vitest";
import { assessLessonQuality } from "../lessonQuality";

const strongLesson = [
  { type: "objective", title: "What you will learn", content: "Explain Hooke's law, identify the limit of proportionality, and calculate extension from force and stiffness." },
  { type: "prior", title: "Before we start", content: "Recall force in newtons and displacement in metres. Stiffness describes how much force is needed per metre of extension." },
  { type: "concept", title: "The physical idea", content: "When a spring is loaded within its elastic range, force is proportional to extension. The relationship is useful because it connects a measurable force to a measurable displacement." },
  { type: "definition", title: "Key terms", content: "Extension is the increase in length. Elastic deformation means the object returns to its original shape when the load is removed. The limit of proportionality is where the force-extension graph stops being a straight line." },
  { type: "formula", title: "Hooke's law", content: "F = kx. F is force in N, k is stiffness in N m^-1, and x is extension in m. The equation applies while force remains proportional to extension." },
  { type: "example", title: "Worked example", content: "A spring has stiffness 250 N m^-1 and is extended by 0.040 m. Step 1: write F = kx. Step 2: substitute F = 250 x 0.040. Step 3: calculate F = 10 N. Check that the unit is newtons." },
  { type: "checkpoint", title: "Self-check", content: "If the extension doubles while the spring remains within the proportional region, what happens to force? Answer: it doubles because F is directly proportional to x." },
  { type: "misconception", title: "Common misconception", content: "Do not confuse stiffness with extension. A larger k means more force is required for the same extension, not that the spring automatically stretches more." },
  { type: "exam", title: "Exam application", content: "In an exam, state the proportional relationship, quote the equation, substitute values with units, and give a sensible final unit. On a graph question, identify the straight-line region before discussing the limit of proportionality." },
  { type: "mistake", title: "Common trap", content: "A frequent mistake is entering centimetres directly into F = kx when k is in N m^-1. Convert 4.0 cm to 0.040 m before calculating." },
  { type: "summary", title: "Remember", content: "Within the proportional region, force rises linearly with extension. The gradient of a force-extension graph gives stiffness. Always check the units and the region where the relationship applies." },
  { type: "practice", title: "Practice", content: "1) A 300 N m^-1 spring extends 0.020 m. Find F. 2) A force of 12 N produces 0.030 m extension. Find k. 3) Explain why Hooke's law cannot be assumed after the proportional limit. Answer guidance: 6 N; 400 N m^-1; proportionality has broken down." },
  { type: "tip", title: "Exam tactic", content: "For calculation questions, write the governing equation first, convert units second, substitute third, then check whether the answer has a physically sensible magnitude." },
];

describe("lesson quality", () => {
  it("rejects the tiny generic Physics lesson on P failure mode", () => {
    const result = assessLessonQuality([
      { type: "concept", title: "Physics lesson on P", content: "P is an important concept in physics. Learn what P means and remember the definition." },
    ]);
    expect(result.passed).toBe(false);
    expect(result.score).toBeLessThan(70);
    expect(result.issues).toContain("too-short");
  });

  it("accepts a specific, structured lesson", () => {
    const result = assessLessonQuality(strongLesson);
    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.issues).toHaveLength(0);
  });

  it("detects missing teaching ingredients", () => {
    const result = assessLessonQuality(strongLesson.filter((block) => !["example", "practice", "misconception"].includes(block.type)));
    expect(result.passed).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining(["missing-worked-example", "missing-practice", "missing-misconception"]));
  });

  it("penalises repeated blocks instead of counting repetition as depth", () => {
    const repeated = Array.from({ length: 12 }, (_, index) => ({
      type: index === 0 ? "objective" : "concept",
      title: "Hooke's law",
      content: "Hooke's law states that force is proportional to extension while the spring remains within the proportional region.",
    }));
    const result = assessLessonQuality(repeated);
    expect(result.passed).toBe(false);
    expect(result.issues).toContain("repetition");
  });
});
