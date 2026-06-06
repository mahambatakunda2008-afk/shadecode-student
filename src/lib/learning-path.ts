import type {
  EducationLevel,
  LearningGoal,
  SubjectInterest,
  LearningPath,
} from "@/types/onboarding";

type FocusMode = LearningPath["focus_mode"];
type DifficultyLevel = LearningPath["difficulty_level"];

const GOAL_TO_FOCUS_MODE: Record<LearningGoal, FocusMode> = {
  exam_preparation: "exam_sprint",
  skill_development: "steady_progress",
  career_building: "career",
  exploration: "exploration",
};

const EDUCATION_TO_DIFFICULTY: Record<EducationLevel, DifficultyLevel> = {
  basic: "foundation",
  secondary: "foundation",
  tvet: "intermediate",
  university: "advanced",
  self_learning: "intermediate",
};

const EDUCATION_TO_DAILY_MINUTES: Record<EducationLevel, number> = {
  basic: 30,
  secondary: 45,
  tvet: 60,
  university: 90,
  self_learning: 60,
};

const GOAL_SUBJECT_BOOSTS: Record<LearningGoal, SubjectInterest[]> = {
  exam_preparation: ["mathematics", "english"],
  skill_development: ["coding", "computer_science"],
  career_building: ["business", "economics", "accounting"],
  exploration: [],
};

export function initializeLearningPath(
  userId: string,
  educationLevel: EducationLevel,
  learningGoal: LearningGoal,
  subjectInterests: SubjectInterest[]
): Omit<LearningPath, "id" | "created_at" | "updated_at"> {
  const focusMode = GOAL_TO_FOCUS_MODE[learningGoal];
  const difficultyLevel = EDUCATION_TO_DIFFICULTY[educationLevel];
  const dailyGoalMinutes = EDUCATION_TO_DAILY_MINUTES[educationLevel];

  // Merge user interests + goal boosts, deduplicate, cap at 6
  const goalBoosts = GOAL_SUBJECT_BOOSTS[learningGoal];
  const combined = [...subjectInterests, ...goalBoosts];
  const unique = Array.from(new Set(combined));
  const recommendedSubjects = unique.slice(0, 6) as SubjectInterest[];

  // Fallback if user picked nothing
  const finalSubjects =
    recommendedSubjects.length > 0
      ? recommendedSubjects
      : (["mathematics", "english", "computer_science"] as SubjectInterest[]);

  return {
    user_id: userId,
    recommended_subjects: finalSubjects,
    daily_goal_minutes: dailyGoalMinutes,
    focus_mode: focusMode,
    difficulty_level: difficultyLevel,
  };
}
