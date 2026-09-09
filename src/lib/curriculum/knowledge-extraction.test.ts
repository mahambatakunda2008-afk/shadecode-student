import { describe, expect, it } from "vitest";
import { extractCurriculumKnowledge } from "./knowledge-extraction";

const identity = {
  boardId: "example-board",
  qualificationId: "example-qualification",
  level: "o_level",
  syllabusId: "example-subject",
  syllabusVersion: "2026-2030",
  subjectId: "computer-science",
};

const provenance = {
  authority: "Example Authority",
  sourceDocument: "https://example.test/syllabus.pdf",
  sourceUrl: "https://example.test/syllabus.pdf",
  retrievedAt: "2026-09-09T00:00:00.000Z",
  mappingStatus: "pending" as const,
};

describe("extractCurriculumKnowledge", () => {
  it("extracts configured whole-syllabus layers without treating every numbered line as an objective", () => {
    const items = extractCurriculumKnowledge(
      `
TOPICS
Hardware and software; Algorithms; Databases

LEARNING OUTCOMES
Students can design and test solutions.

ASSESSMENT
Paper 1 is a written examination.

4.1 Demonstrate problem solving.
4.2 Evaluate solutions.
5.1 This is ordinary numbered content and must not become an objective.
`,
      identity,
      provenance,
      {
        sectionKinds: {
          topics: "topic",
          "learning outcomes": "learning_outcome",
          assessment: "assessment_requirement",
        },
        objectiveCodePattern: "^4\\.[1-2]$",
      },
    );

    expect(items.some((item) => item.kind === "topic")).toBe(true);
    expect(items.some((item) => item.kind === "learning_outcome")).toBe(true);
    expect(items.some((item) => item.kind === "assessment_requirement")).toBe(true);
    expect(items.filter((item) => item.kind === "objective").map((item) => item.code)).toEqual(["4.1", "4.2"]);
    expect(items.some((item) => item.code === "5.1")).toBe(false);
    expect(items.every((item) => item.status === "draft")).toBe(true);
  });
});
