export const CURRICULUM_COMPLETENESS_DIMENSIONS = [
  "identity",
  "source",
  "document",
  "structure",
  "scope",
  "objectives",
  "content_scope",
  "competencies",
  "skills",
  "prerequisites",
  "progression",
  "assessment_objectives",
  "assessment_structure",
  "paper_components",
  "assessment_weightings",
  "examination_format",
  "practical_requirements",
  "project_requirements",
  "coursework_requirements",
  "terminology",
  "constraints",
  "guidance",
  "resources",
  "past_paper_coverage",
  "mark_scheme_coverage",
  "examiner_report_coverage",
  "grade_threshold_coverage",
  "change_history",
  "provenance",
] as const;

export type CurriculumCompletenessDimension = (typeof CURRICULUM_COMPLETENESS_DIMENSIONS)[number];
export type CurriculumCoverageStatus = "missing" | "partial" | "verified" | "blocked";

export interface CurriculumCoverageCheck {
  dimension: CurriculumCompletenessDimension;
  status: CurriculumCoverageStatus;
  evidence?: unknown;
  notes?: string;
}

export interface CurriculumCompletenessResult {
  complete: boolean;
  verifiedCount: number;
  partialCount: number;
  missingCount: number;
  blockedCount: number;
  missing: CurriculumCompletenessDimension[];
  partial: CurriculumCompletenessDimension[];
  blocked: CurriculumCompletenessDimension[];
}

/**
 * A curriculum is production-complete only when every required dimension has
 * explicit verified evidence. Objectives alone can never make a syllabus
 * production-complete.
 */
export function evaluateCurriculumCompleteness(
  checks: CurriculumCoverageCheck[],
): CurriculumCompletenessResult {
  const byDimension = new Map(checks.map((check) => [check.dimension, check]));
  const missing: CurriculumCompletenessDimension[] = [];
  const partial: CurriculumCompletenessDimension[] = [];
  const blocked: CurriculumCompletenessDimension[] = [];

  for (const dimension of CURRICULUM_COMPLETENESS_DIMENSIONS) {
    const check = byDimension.get(dimension);
    if (!check || check.status === "missing") missing.push(dimension);
    else if (check.status === "partial") partial.push(dimension);
    else if (check.status === "blocked") blocked.push(dimension);
  }

  const verifiedCount = CURRICULUM_COMPLETENESS_DIMENSIONS.length - missing.length - partial.length - blocked.length;

  return {
    complete: missing.length === 0 && partial.length === 0 && blocked.length === 0,
    verifiedCount,
    partialCount: partial.length,
    missingCount: missing.length,
    blockedCount: blocked.length,
    missing,
    partial,
    blocked,
  };
}

export function isProductionCompleteCurriculum(checks: CurriculumCoverageCheck[]): boolean {
  return evaluateCurriculumCompleteness(checks).complete;
}
