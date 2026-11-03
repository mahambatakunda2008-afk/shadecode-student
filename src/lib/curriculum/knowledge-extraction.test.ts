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


describe("Cambridge Biology 9700 2028–2030 extraction profile", () => {
  it("extracts all 19 numbered syllabus topics as draft topic records", async () => {
    const { getCurriculumExtractionProfile } = await import("./extraction-profiles");
    const headings = [
      "Cell structure",
      "Biological molecules",
      "Enzymes",
      "Cell membranes and transport",
      "The mitotic cell cycle",
      "Nucleic acids and protein synthesis",
      "Transport in plants",
      "Transport in mammals",
      "Gas exchange",
      "Infectious diseases",
      "Immunity",
      "Energy and respiration",
      "Photosynthesis",
      "Homeostasis",
      "Control and coordination",
      "Inheritance",
      "Selection and evolution",
      "Classification, biodiversity and conservation",
      "Genetic technology",
    ];
    const syllabusText = headings.map((heading, index) =>
      `${index + 1} ${heading}\nStudents should understand the key concepts and apply them.`
    ).join("\n\n");
    const items = extractCurriculumKnowledge(
      syllabusText,
      {
        boardId: "cambridge",
        qualificationId: "cambridge-as-a-level",
        level: "as_a_level",
        syllabusId: "cambridge-9700",
        syllabusVersion: "2028-2030",
        subjectId: "biology",
      },
      {
        authority: "Cambridge International Education",
        sourceDocument: "https://www.cambridgeinternational.org/Images/744622-2028-2030-syllabus.pdf",
        sourceUrl: "https://www.cambridgeinternational.org/Images/744622-2028-2030-syllabus.pdf",
        retrievedAt: "2026-11-03T00:00:00.000Z",
        mappingStatus: "pending",
      },
      getCurriculumExtractionProfile("cambridge-as-a-level-biology-9700-2028-2030"),
    );
    const topics = items.filter((item) => item.kind === "topic");
    expect(topics).toHaveLength(19);
    expect(topics.map((item) => item.title)).toEqual(headings.map((heading, index) => `${index + 1} ${heading}`));
    expect(topics.every((item) => item.status === "draft")).toBe(true);
    expect(topics.every((item) => item.identity.syllabusVersion === "2028-2030")).toBe(true);
  });

  it("does not promote numbered Biology syllabus content lines into objective records", async () => {
    const { getCurriculumExtractionProfile } = await import("./extraction-profiles");
    const items = extractCurriculumKnowledge(
      "1 Cell structure\n1.1 Describe the structure of a typical prokaryotic cell.\n1.2 Explain the role of organelles.",
      {
        boardId: "cambridge",
        qualificationId: "cambridge-as-a-level",
        level: "as_a_level",
        syllabusId: "cambridge-9700",
        syllabusVersion: "2028-2030",
        subjectId: "biology",
      },
      provenance,
      getCurriculumExtractionProfile("cambridge-as-a-level-biology-9700-2028-2030"),
    );
    expect(items.some((item) => item.kind === "objective")).toBe(false);
  });

  it("preserves separate topic records when different topics share identical extracted text", async () => {
    const { getCurriculumExtractionProfile } = await import("./extraction-profiles");
    const headings = [
      "Cell structure", "Biological molecules", "Enzymes", "Cell membranes and transport",
      "The mitotic cell cycle", "Nucleic acids and protein synthesis", "Transport in plants",
      "Transport in mammals", "Gas exchange", "Infectious diseases", "Immunity",
      "Energy and respiration", "Photosynthesis", "Homeostasis", "Control and coordination",
      "Inheritance", "Selection and evolution", "Classification, biodiversity and conservation",
      "Genetic technology",
    ];
    const repeatedBody = "Students should understand the key concepts and apply them.";
    const items = extractCurriculumKnowledge(
      headings.map((heading, index) => `${index + 1} ${heading}\n${repeatedBody}`).join("\n\n"),
      {
        boardId: "cambridge",
        qualificationId: "cambridge-as-a-level",
        level: "as_a_level",
        syllabusId: "cambridge-9700",
        syllabusVersion: "2028-2030",
        subjectId: "biology",
      },
      provenance,
      getCurriculumExtractionProfile("cambridge-as-a-level-biology-9700-2028-2030"),
    );
    const topics = items.filter((item) => item.kind === "topic");
    expect(topics).toHaveLength(19);
    expect(new Set(topics.map((item) => item.title)).size).toBe(19);
    expect(new Set(topics.map((item) => item.metadata?.stableKey)).size).toBe(19);
  });

  it("retains topic headings as draft records when PDF extraction yields no body text", async () => {
    const { getCurriculumExtractionProfile } = await import("./extraction-profiles");
    const items = extractCurriculumKnowledge(
      "1 Cell structure\\n2 Biological molecules\\n3 Enzymes",
      {
        boardId: "cambridge",
        qualificationId: "cambridge-as-a-level",
        level: "as_a_level",
        syllabusId: "cambridge-9700",
        syllabusVersion: "2028-2030",
        subjectId: "biology",
      },
      provenance,
      getCurriculumExtractionProfile("cambridge-as-a-level-biology-9700-2028-2030"),
    );
    const topics = items.filter((item) => item.kind === "topic");
    expect(topics.map((item) => item.title)).toEqual([
      "1 Cell structure",
      "2 Biological molecules",
      "3 Enzymes",
    ]);
    expect(topics.every((item) => item.status === "draft")).toBe(true);
    expect(topics.every((item) => item.content.trim().length > 0)).toBe(true);
  });

});
