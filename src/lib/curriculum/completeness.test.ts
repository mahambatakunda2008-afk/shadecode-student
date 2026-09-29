import { describe, expect, it } from "vitest";
import {
  CURRICULUM_COMPLETENESS_DIMENSIONS,
  EXAM_HISTORY_DIMENSIONS,
  evaluateCurriculumCompleteness,
  type CurriculumCoverageCheck,
} from "./completeness";

describe("curriculum gate tiers", () => {
  it("allows syllabus verification without exam-history evidence", () => {
    const checks: CurriculumCoverageCheck[] = CURRICULUM_COMPLETENESS_DIMENSIONS.map((dimension) => ({
      dimension,
      status: (EXAM_HISTORY_DIMENSIONS as readonly string[]).includes(dimension) ? "missing" : "verified",
    }));

    expect(evaluateCurriculumCompleteness(checks, "syllabus").complete).toBe(true);
    expect(evaluateCurriculumCompleteness(checks, "syllabus").missing).toEqual([]);
    expect(evaluateCurriculumCompleteness(checks, "exam").complete).toBe(false);
    expect(evaluateCurriculumCompleteness(checks, "exam").missing).toHaveLength(4);
  });
});
