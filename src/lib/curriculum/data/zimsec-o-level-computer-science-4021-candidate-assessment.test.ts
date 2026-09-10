import { describe, expect, it } from "vitest";
import { ZIMSEC_O_LEVEL_CS_4021_CANDIDATE_ASSESSMENT } from "./zimsec-o-level-computer-science-4021-candidate-assessment";

describe("ZIMSEC Computer Science 4021 candidate assessment", () => {
  it("keeps the assessment specification draft until official syllabus reconciliation", () => {
    expect(ZIMSEC_O_LEVEL_CS_4021_CANDIDATE_ASSESSMENT.length).toBeGreaterThan(0);
    expect(ZIMSEC_O_LEVEL_CS_4021_CANDIDATE_ASSESSMENT.every((item) => item.status === "draft")).toBe(true);
    expect(
      ZIMSEC_O_LEVEL_CS_4021_CANDIDATE_ASSESSMENT.every(
        (item) => item.metadata?.sourceType === "secondary-syllabus-copy",
      ),
    ).toBe(true);
  });

  it("captures both practical Paper 3 options", () => {
    const practical = ZIMSEC_O_LEVEL_CS_4021_CANDIDATE_ASSESSMENT.filter(
      (item) => item.metadata?.paper === "3",
    );
    expect(practical.map((item) => item.metadata?.option)).toEqual(["A", "B"]);
    expect(practical.every((item) => item.metadata?.durationMinutes === 180)).toBe(true);
  });
});
