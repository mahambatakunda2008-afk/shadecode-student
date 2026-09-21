export const CURRICULUM_COMPLETENESS_DIMENSIONS = [
  "identity", "source", "document", "structure", "scope", "objectives", "content_scope",
  "competencies", "skills", "prerequisites", "progression", "assessment_objectives",
  "assessment_structure", "paper_components", "assessment_weightings", "examination_format",
  "practical_requirements", "project_requirements", "coursework_requirements", "terminology",
  "constraints", "guidance", "resources", "past_paper_coverage", "mark_scheme_coverage",
  "examiner_report_coverage", "grade_threshold_coverage", "change_history", "provenance",
] as const;

export type CurriculumCompletenessDimension = (typeof CURRICULUM_COMPLETENESS_DIMENSIONS)[number];

/**
 * Dimensions about exam HISTORY (real past papers, mark schemes, examiner reports, grade thresholds), as opposed to
 * what the syllabus itself says. A syllabus PDF cannot evidence them; see docs/curriculum/coverage-evidence-policy.md.
 */
export const EXAM_HISTORY_DIMENSIONS = [
  "past_paper_coverage", "mark_scheme_coverage", "examiner_report_coverage", "grade_threshold_coverage",
] as const satisfies readonly CurriculumCompletenessDimension[];

/** The dimensions that describe the syllabus itself (everything except exam history). */
export const SYLLABUS_DIMENSIONS: readonly CurriculumCompletenessDimension[] = CURRICULUM_COMPLETENESS_DIMENSIONS.filter(
  (dimension) => !(EXAM_HISTORY_DIMENSIONS as readonly string[]).includes(dimension),
);

/**
 * Which coverage a resolution must have.
 * - "exam" (default everywhere): all 29 dimensions. Required for anything that makes exam-history claims
 *   (past-paper practice, mark-scheme conventions, grade boundaries).
 * - "syllabus": the 25 syllabus dimensions. Sufficient to ground teaching in the verified syllabus, provided the
 *   consumer does NOT make exam-history claims (the resolved context reports `examHistoryVerified`).
 */
export type CurriculumGateTier = "syllabus" | "exam";

export function requiredDimensionsForTier(tier: CurriculumGateTier): readonly CurriculumCompletenessDimension[] {
  return tier === "exam" ? CURRICULUM_COMPLETENESS_DIMENSIONS : SYLLABUS_DIMENSIONS;
}
export type CurriculumCoverageStatus = "missing" | "partial" | "verified" | "blocked" | "not_applicable";

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
  notApplicableCount: number;
  missing: CurriculumCompletenessDimension[];
  partial: CurriculumCompletenessDimension[];
  blocked: CurriculumCompletenessDimension[];
  notApplicable: CurriculumCompletenessDimension[];
}

export function evaluateCurriculumCompleteness(checks: CurriculumCoverageCheck[]): CurriculumCompletenessResult {
  const byDimension = new Map(checks.map((check) => [check.dimension, check]));
  const missing: CurriculumCompletenessDimension[] = [];
  const partial: CurriculumCompletenessDimension[] = [];
  const blocked: CurriculumCompletenessDimension[] = [];
  const notApplicable: CurriculumCompletenessDimension[] = [];

  for (const dimension of CURRICULUM_COMPLETENESS_DIMENSIONS) {
    const check = byDimension.get(dimension);
    if (!check || check.status === "missing") missing.push(dimension);
    else if (check.status === "partial") partial.push(dimension);
    else if (check.status === "blocked") blocked.push(dimension);
    else if (check.status === "not_applicable") notApplicable.push(dimension);
  }

  const verifiedCount = CURRICULUM_COMPLETENESS_DIMENSIONS.length - missing.length - partial.length - blocked.length - notApplicable.length;
  return { complete: missing.length === 0 && partial.length === 0 && blocked.length === 0, verifiedCount, partialCount: partial.length, missingCount: missing.length, blockedCount: blocked.length, notApplicableCount: notApplicable.length, missing, partial, blocked, notApplicable };
}

export function isProductionCompleteCurriculum(checks: CurriculumCoverageCheck[]): boolean {
  return evaluateCurriculumCompleteness(checks).complete;
}
