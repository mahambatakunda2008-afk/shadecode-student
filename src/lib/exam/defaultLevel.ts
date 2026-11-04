/**
 * Which exam level to preselect for a learner. Indexes match `LEVELS` in ExamWorkspace:
 * 0 = O-Level (Forms 1-4), 1 = A-Level (Forms 5-6), 2 = University.
 * The learner can always change it; this only chooses the starting point.
 */
export function defaultExamLevelIndex(studyLevel?: string | null): 0 | 1 | 2 {
  switch (studyLevel) {
    case "early-childhood":
    case "primary":
    case "lower-secondary":
    case "upper-secondary":
      return 0;
    case "university":
      return 2;
    default:
      return 1;
  }
}
