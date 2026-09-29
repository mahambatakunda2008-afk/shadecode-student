import { describe, expect, it } from "vitest";
import { extractCurriculumKnowledge } from "./knowledge-extraction";

const identity = {
  boardId: "cambridge",
  qualificationId: "cambridge-as-a-level",
  level: "a_level",
  syllabusId: "cambridge-9700",
  syllabusVersion: "2025-2027",
  subjectId: "biology",
};

const provenance = {
  authority: "Cambridge International Education",
  sourceDocument: "biology-9700.pdf",
  sourceUrl: "https://www.cambridgeinternational.org/Images/664560-2025-2027-syllabus.pdf",
  retrievedAt: "2026-09-29",
  mappingStatus: "reviewed" as const,
};

describe("subsection-aware Cambridge outcome extraction", () => {
  it("binds numbered outcomes to their subsection", () => {
    const items = extractCurriculumKnowledge(
      `1.2 Cells as the basic units of living organisms
Learning outcomes
Candidates should be able to:
1 recognise organelles and other cell structures
2 compare typical plant and animal cells
1.3 Viruses
Learning outcomes
1 describe virus structure
`,
      identity,
      provenance,
      {
        numberedSectionHeadings: true,
        numberedSectionKind: "content_scope",
        numberedLearningOutcomes: true,
      },
    );

    const outcomes = items.filter((item) => item.kind === "learning_outcome");
    expect(outcomes.map((item) => item.code)).toEqual(["1.2.1", "1.2.2", "1.3.1"]);
    expect(outcomes[0]?.title).toContain("outcome 1");
    expect(outcomes[0]?.content).toContain("recognise organelles");
    expect(outcomes[2]?.content).toContain("virus structure");
  });
});
