import { learnerDifficulty, type LearnerStage } from "./learnerLevel";

/**
 * Which exam level to preselect for a learner. Indexes match `LEVELS` in ExamWorkspace:
 * 0 = O-Level (Forms 1-4), 1 = A-Level (Forms 5-6), 2 = University.
 * The learner can always change it; this only chooses the starting point. An unknown stage keeps A-Level.
 */
export function defaultExamLevelIndex(stage: LearnerStage): 0 | 1 | 2 {
  switch (learnerDifficulty(stage)) {
    case "easy":
      return 0;
    case "hard":
      return 2;
    default:
      return 1;
  }
}
