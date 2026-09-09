import { describe, expect, it } from "vitest";
import type { CurriculumObjective } from "./objective-first";
import { diffObjectives, extractNumberedObjectives } from "./change-intelligence";

const curriculum = {
  boardId: "zimsec",
  qualificationId: "zimsec-o-level",
  level: "o_level" as const,
  syllabusId: "zimsec-4021",
  syllabusVersion: "2024-2030",
  subjectId: "computer-science",
};

const provenance = {
  authority: "ZIMSEC / Ministry of Primary and Secondary Education",
  sourceDocument: "Computer Science Syllabus Forms 1-4, 2024-2030",
  sourceUrl: "https://www5.zimsec.co.zw/syllabi/",
  sectionOrPage: "Section 8",
  retrievedAt: "2026-09-09",
  mappingStatus: "reviewed" as const,
};

function objective(code: string, statement: string): CurriculumObjective {
  return {
    id: `test-${code}`,
    code,
    statement,
    status: "draft",
    curriculum,
    provenance,
  };
}

describe("extractNumberedObjectives", () => {
  it("extracts numbered objective statements without verifying them", () => {
    const result = extractNumberedObjectives(
      "4.1 describe information processing systems\n4.2 explain effects of introducing systems",
      curriculum,
      provenance,
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ code: "4.1", status: "draft" });
    expect(result[1]).toMatchObject({ code: "4.2", status: "draft" });
  });

  it("joins objective statements wrapped across PDF extraction lines", () => {
    const result = extractNumberedObjectives(
      "4.1 Describe a range of information processing\nsystems and their uses.\n4.2 Explain the effects\nof introducing information processing systems.",
      curriculum,
      provenance,
    );

    expect(result).toHaveLength(2);
    expect(result[0].statement).toBe("Describe a range of information processing systems and their uses.");
    expect(result[1].statement).toBe("Explain the effects of introducing information processing systems.");
  });
});

describe("diffObjectives", () => {
  it("detects unchanged objectives", () => {
    const result = diffObjectives(
      [objective("4.1", "Describe information processing systems")],
      [objective("4.1", "Describe information processing systems")],
    );

    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "unchanged", requiresVerification: false }),
    ]));
  });

  it("detects modified objectives and requires verification", () => {
    const result = diffObjectives(
      [objective("4.1", "Describe information processing systems")],
      [objective("4.1", "Describe a range of information processing systems")],
    );

    expect(result[0]).toMatchObject({ type: "modified", requiresVerification: true });
  });

  it("detects added and removed objectives", () => {
    const result = diffObjectives(
      [objective("4.1", "Describe information processing systems")],
      [objective("4.2", "Explain effects of information processing systems")],
    );

    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "removed", requiresVerification: true }),
      expect.objectContaining({ type: "added", requiresVerification: true }),
    ]));
  });

  it("flags a likely rename or recode instead of silently treating it as new content", () => {
    const result = diffObjectives(
      [objective("8.18.1", "Use selection and repetition in algorithms")],
      [objective("8.18.2", "Use selection and repetition in algorithms")],
    );

    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "possible_rename", requiresVerification: true }),
    ]));
    expect(result.filter((change) => change.type === "possible_rename")).toHaveLength(2);
  });
});
