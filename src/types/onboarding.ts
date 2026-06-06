export type EducationLevel =
  | "basic"
  | "secondary"
  | "tvet"
  | "university"
  | "self_learning";

export type LearningGoal =
  | "exam_preparation"
  | "skill_development"
  | "career_building"
  | "exploration";

export type SubjectInterest =
  | "mathematics"
  | "physics"
  | "chemistry"
  | "biology"
  | "computer_science"
  | "coding"
  | "business"
  | "economics"
  | "english"
  | "history"
  | "geography"
  | "accounting"
  | "art"
  | "music";

export interface OnboardingData {
  education_level: EducationLevel | null;
  learning_goal: LearningGoal | null;
  subject_interests: SubjectInterest[];
}

export interface UserProfile {
  id: string;
  user_id: string;
  education_level: EducationLevel | null;
  learning_goal: LearningGoal | null;
  subject_interests: SubjectInterest[];
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface LearningPath {
  id: string;
  user_id: string;
  recommended_subjects: SubjectInterest[];
  daily_goal_minutes: number;
  focus_mode: "exam_sprint" | "steady_progress" | "exploration" | "career";
  difficulty_level: "foundation" | "intermediate" | "advanced";
  created_at: string;
  updated_at: string;
}

export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;

export interface OnboardingStepConfig {
  step: OnboardingStep;
  title: string;
  subtitle: string;
}