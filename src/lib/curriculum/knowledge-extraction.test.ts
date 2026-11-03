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
      `1 Cell structure\n2 Biological molecules\n3 Enzymes`,
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


  it("extracts Cambridge Biology subtopics and numbered learning outcomes with parent links", async () => {
    const { getCurriculumExtractionProfile } = await import("./extraction-profiles");
    const items = extractCurriculumKnowledge(
      [
        "1 Cell structure",
        "Topic introduction text.",
        "1.1 The microscope in cell studies",
        "Learning outcomes",
        "Candidates should be able to:",
        "1 make temporary preparations of cellular material suitable for",
        "viewing with a light microscope",
        "2 draw cells from microscope slides and photomicrographs",
        "1.2 Cells as the basic units of living organisms",
        "Learning outcomes",
        "Candidates should be able to:",
        "1 recognise organelles and other cell structures found in eukaryotic cells",
        "• cell surface membrane",
        "• nucleus and nucleolus",
      ].join("\n"),
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

    const subtopics = items.filter((item) => item.metadata?.extraction === "cambridge-subtopic");
    const outcomes = items.filter((item) => item.kind === "learning_outcome");
    expect(subtopics.map((item) => item.code)).toEqual(["1.1", "1.2"]);
    expect(outcomes.map((item) => item.code)).toEqual(["1.1.1", "1.1.2", "1.2.1"]);
    expect(outcomes[0].content).toContain("viewing with a light microscope");
    expect(outcomes[2].content).toContain("cell surface membrane");
    expect(outcomes.every((item) => item.parentId === subtopics.find((parent) => parent.code === item.code?.split(".").slice(0, 2).join("."))?.id)).toBe(true);
    expect(subtopics.every((item) => item.parentId)).toBe(true);
    expect([...subtopics, ...outcomes].every((item) => item.status === "draft")).toBe(true);
  });
  it("extracts Paper 3 and Paper 5 practical assessment requirements separately", async () => {
    const { getCurriculumExtractionProfile } = await import("./extraction-profiles");
    const items = extractCurriculumKnowledge(
      [
        "5 Practical assessment",
        "Practical assessment",
        "At least 20% of course time should be practical work.",
        "Practical work develops investigative skills and supports understanding of biological concepts.",
        "Paper 3 – Advanced Practical Skills",
        "Paper 3 consists of two or three questions, totalling 40 marks.",
        "manipulation, measurement and observation",
        "presentation of data and observations",
        "decisions relating to measurements and observations",
        "collection of data and observations",
        "Paper 5",
        "Paper 5 is a timetabled, written paper.",
        "planning, analysis, conclusions and evaluation",
        "defining the problem",
        "methods",
        "dealing with data",
        "Safety in the laboratory",
        "Responsibility for safety matters rests with centres.",
      ].join("\n"),
      { boardId: "cambridge", qualificationId: "cambridge-as-a-level", level: "as_a_level", syllabusId: "cambridge-9700", syllabusVersion: "2028-2030", subjectId: "biology" },
      provenance,
      getCurriculumExtractionProfile("cambridge-as-a-level-biology-9700-2028-2030"),
    );
    const overview = items.find((item) => item.metadata?.extraction === "cambridge-practical-assessment-overview");
    expect(overview?.kind).toBe("practical_activity");
    expect(overview?.code).toBe("PRACTICAL-OVERVIEW");
    expect(overview?.content).toContain("At least 20% of course time");
    expect(overview?.content).toContain("investigative skills");
    expect(overview?.status).toBe("draft");
    const practical = items.filter((item) => item.metadata?.extraction === "cambridge-practical-assessment");
    expect(practical.map((item) => item.code)).toEqual(["P3", "P5"]);
    expect(practical.every((item) => item.parentId === overview?.id)).toBe(true);
    expect(practical[0].content).toContain("manipulation, measurement and observation");
    expect(practical[1].content).toContain("planning, analysis, conclusions and evaluation");
    expect(practical[0].content).not.toContain("Paper 5 is");
    expect(practical.every((item) => item.kind === "assessment_requirement" && item.status === "draft")).toBe(true);
    const skills = items.filter((item) => item.metadata?.extraction === "cambridge-practical-skill");
    expect(skills.map((item) => item.code)).toEqual([
      "P3-manipulation-measurement-and-observation",
      "P3-decisions-relating-to-measurements-and-observations",
      "P3-collection-of-data-and-observations",
      "P3-presentation-of-data-and-observations",
      "P5-planning",
      "P5-defining-the-problem",
      "P5-methods",
      "P5-analysis-conclusions-and-evaluation",
      "P5-dealing-with-data",
      "P5-conclusions",
      "P5-evaluation",
    ]);
    expect(skills.every((item) => item.kind === "skill" && item.status === "draft")).toBe(true);
    expect(skills.every((item) => item.parentId === practical.find((paper) => paper.code === item.code?.slice(0, 2))?.id)).toBe(true);
  });
  it("joins wrapped Cambridge Biology subtopic headings and ignores continued repeats", async () => {
    const { getCurriculumExtractionProfile } = await import("./extraction-profiles");
    const items = extractCurriculumKnowledge(
      [
        "1 Cell structure",
        "1.1 The microscope in cell",
        "studies",
        "1.1 The microscope in cell studies (continued)",
        "Learning outcomes",
        "Candidates should be able to:",
        "1 use a light microscope",
      ].join("\n"),
      { boardId: "cambridge", qualificationId: "cambridge-as-a-level", level: "as_a_level", syllabusId: "cambridge-9700", syllabusVersion: "2028-2030", subjectId: "biology" },
      provenance,
      getCurriculumExtractionProfile("cambridge-as-a-level-biology-9700-2028-2030"),
    );
    const subtopics = items.filter((item) => item.metadata?.extraction === "cambridge-subtopic");
    expect(subtopics).toHaveLength(1);
    expect(subtopics[0].title).toBe("The microscope in cell studies");
    expect(items.filter((item) => item.kind === "learning_outcome").map((item) => item.code)).toEqual(["1.1.1"]);
  });
  it("tags Biology topics and descendants as AS core or A Level extension", async () => {
    const { getCurriculumExtractionProfile } = await import("./extraction-profiles");
    const items = extractCurriculumKnowledge(
      [
        "1 Cell structure",
        "1.1 The microscope in cell studies",
        "Learning outcomes",
        "Candidates should be able to:",
        "1 use a light microscope",
        "12 Energy and respiration",
        "12.1 Respiration",
        "Learning outcomes",
        "Candidates should be able to:",
        "1 explain the role of ATP",
      ].join("\n"),
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
    const topic1 = items.find((item) => item.kind === "topic" && item.title.startsWith("1 Cell"));
    const topic12 = items.find((item) => item.kind === "topic" && item.title.startsWith("12 Energy"));
    const subtopic1 = items.find((item) => item.code === "1.1");
    const outcome1 = items.find((item) => item.code === "1.1.1");
    const subtopic12 = items.find((item) => item.code === "12.1");
    const outcome12 = items.find((item) => item.code === "12.1.1");
    expect(topic1?.metadata?.curriculumStage).toBe("as_level_core");
    expect(subtopic1?.metadata?.curriculumStage).toBe("as_level_core");
    expect(outcome1?.metadata?.curriculumStage).toBe("as_level_core");
    expect(topic12?.metadata?.curriculumStage).toBe("a_level_extension");
    expect(subtopic12?.metadata?.curriculumStage).toBe("a_level_extension");
    expect(outcome12?.metadata?.curriculumStage).toBe("a_level_extension");
  });

});
