/**
 * AS Level learners must not be taught A-Level-only objectives (e.g. Mathematics Paper 3 or 6, Physics topics 12-25).
 * Objectives are stored once per syllabus version with an `education_level`; A Level learners study the AS foundation
 * plus the A-Level-only content, so only the AS-learner case needs filtering. Deliberately narrow: any other
 * combination (including single-level syllabi such as IGCSE, or a missing level) is left visible.
 */
export function objectiveVisibleAtLevel(objectiveLevel: string | null | undefined, learnerLevel: string): boolean {
  return !(learnerLevel === "as_level" && objectiveLevel === "a_level");
}
