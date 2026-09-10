import { describe, expect, it } from "vitest";
import {
  CAMBRIDGE_0478_ASSESSMENT_OBJECTIVES,
  CAMBRIDGE_0478_COMMAND_WORDS,
  CAMBRIDGE_0478_EXAM_REQUIREMENTS,
  CAMBRIDGE_0984_CS_REQUIREMENTS,
  CAMBRIDGE_2210_CS_REQUIREMENTS,
  CAMBRIDGE_9618_ASSESSMENT_OBJECTIVES,
  CAMBRIDGE_9618_COMMAND_WORDS,
  CAMBRIDGE_9618_EXAM_REQUIREMENTS,
  CAMBRIDGE_IGCSE_CS_REQUIREMENTS,
} from "./cambridge-computer-science-requirements";

describe("Cambridge Computer Science requirements", () => {
  it("keeps 0478, 0984 and 2210 aligned as distinct syllabus identities", () => {
    expect(CAMBRIDGE_IGCSE_CS_REQUIREMENTS.length).toBeGreaterThanOrEqual(35);
    expect(CAMBRIDGE_0984_CS_REQUIREMENTS).toHaveLength(CAMBRIDGE_IGCSE_CS_REQUIREMENTS.length);
    expect(CAMBRIDGE_2210_CS_REQUIREMENTS).toHaveLength(CAMBRIDGE_IGCSE_CS_REQUIREMENTS.length);
    expect(CAMBRIDGE_0984_CS_REQUIREMENTS.every((r) => r.syllabusId === "cambridge-0984")).toBe(true);
    expect(CAMBRIDGE_2210_CS_REQUIREMENTS.every((r) => r.syllabusId === "cambridge-2210")).toBe(true);
  });

  it("captures the three 0478 assessment objectives", () => {
    expect(CAMBRIDGE_0478_ASSESSMENT_OBJECTIVES.map((x) => x.weightingPercent)).toEqual([40, 40, 20]);
    expect(CAMBRIDGE_0478_ASSESSMENT_OBJECTIVES.reduce((sum, x) => sum + x.weightingPercent, 0)).toBe(100);
  });

  it("captures 0478 exam-specific constraints", () => {
    expect(CAMBRIDGE_0478_EXAM_REQUIREMENTS).toHaveLength(5);
    expect(CAMBRIDGE_0478_COMMAND_WORDS).toContain("evaluate");
    expect(CAMBRIDGE_0478_COMMAND_WORDS).toContain("suggest");
  });

  it("captures 9618 assessment objectives and exam model", () => {
    expect(CAMBRIDGE_9618_ASSESSMENT_OBJECTIVES.map((x) => x.weightingPercent)).toEqual([50, 30, 20]);
    expect(CAMBRIDGE_9618_ASSESSMENT_OBJECTIVES.reduce((sum, x) => sum + x.weightingPercent, 0)).toBe(100);
    expect(CAMBRIDGE_9618_EXAM_REQUIREMENTS).toHaveLength(6);
    expect(CAMBRIDGE_9618_COMMAND_WORDS).toContain("justify");
    expect(CAMBRIDGE_9618_COMMAND_WORDS).toContain("analyse");
  });

  it("keeps every requirement fail-closed until reconciliation", () => {
    const requirements = [
      ...CAMBRIDGE_IGCSE_CS_REQUIREMENTS,
      ...CAMBRIDGE_0984_CS_REQUIREMENTS,
      ...CAMBRIDGE_2210_CS_REQUIREMENTS,
      ...CAMBRIDGE_0478_ASSESSMENT_OBJECTIVES,
      ...CAMBRIDGE_9618_ASSESSMENT_OBJECTIVES,
      ...CAMBRIDGE_0478_EXAM_REQUIREMENTS,
      ...CAMBRIDGE_9618_EXAM_REQUIREMENTS,
    ];
    expect(requirements.every((item) => item.status === "draft")).toBe(true);
  });
});
