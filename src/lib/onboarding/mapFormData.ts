import type { OnboardingFormData } from "@/types";
import type {
  EducationLevel,
  LearningGoal,
  SubjectInterest,
} from "@/types/onboarding";

/**
 * Bridges the onboarding UI vocabulary (StudyLevel / subject ids / goal labels)
 * to the canonical API schema (EducationLevel / SubjectInterest / LearningGoal)
 * persisted by /api/onboarding/complete.
 */

const STUDY_LEVEL_TO_EDUCATION: Record<string, EducationLevel> = {
  "high-school": "secondary",
  // A-Level is pre-tertiary education. The canonical persisted enum currently
  // has no dedicated A-Level value, so retain it under secondary while the
  // normalized academic context preserves the more precise `a_level` pathway.
  "a-level": "secondary",
  university: "university",
  professional: "tvet",
};

const GOAL_LABEL_TO_LEARNING_GOAL: Record<string, LearningGoal> = {
  "Pass school exams": "exam_preparation",
  "Improve grades": "exam_preparation",
  "Prepare for university": "exam_preparation",
  "Learn a new skill": "skill_development",
  "Build projects": "skill_development",
  "Get a job": "career_building",
  "Change careers": "career_building",
  "Explore interests": "exploration",
};

const SUBJECT_ID_TO_INTEREST: Record<string, SubjectInterest> = {
  maths: "mathematics",
  physics: "physics",
  chemistry: "chemistry",
  biology: "biology",
  english: "english",
  history: "history",
  geography: "geography",
  "computer-science": "computer_science",
  economics: "economics",
  business: "business",
  art: "art",
  music: "music",
};

export interface OnboardingApiPayload {
  education_level: EducationLevel;
  learning_goal: LearningGoal;
  subject_interests: SubjectInterest[];
  goals: string[];
}

export function mapOnboardingFormData(
  form: Partial<OnboardingFormData>
): OnboardingApiPayload {
  const education_level =
    STUDY_LEVEL_TO_EDUCATION[form.studyLevel ?? ""] ?? "secondary";

  const goals = form.goals ?? [];
  const learning_goal: LearningGoal =
    goals
      .map((goal) => GOAL_LABEL_TO_LEARNING_GOAL[goal])
      .find((goal): goal is LearningGoal => Boolean(goal)) ?? "exam_preparation";

  const subject_interests = (form.subjects ?? [])
    .map((subject) => SUBJECT_ID_TO_INTEREST[subject])
    .filter((subject): subject is SubjectInterest => Boolean(subject));

  return { education_level, learning_goal, subject_interests, goals };
}
