import type { OnboardingFormData } from "@/types";
import type { EducationLevel, LearningGoal, SubjectInterest } from "@/types/onboarding";

/** Maps granular onboarding vocabulary to the current profile storage buckets. */
const STUDY_LEVEL_TO_EDUCATION: Record<string, EducationLevel> = {
  primary: "basic",
  "lower-secondary": "secondary",
  "upper-secondary": "secondary",
  "a-level": "secondary",
  university: "university",
  tvet: "tvet",
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
  maths: "mathematics", physics: "physics", chemistry: "chemistry", biology: "biology",
  english: "english", history: "history", geography: "geography",
  "computer-science": "computer_science", economics: "economics", business: "business",
  accounting: "accounting", art: "art", music: "music",
};

export interface OnboardingApiPayload {
  education_level: EducationLevel;
  learning_goal: LearningGoal;
  subject_interests: SubjectInterest[];
  goals: string[];
  institution?: string;
  programme?: string;
  year_level?: string;
  semester?: string;
  courses?: string[];
}

export function mapOnboardingFormData(form: Partial<OnboardingFormData>): OnboardingApiPayload {
  const education_level = STUDY_LEVEL_TO_EDUCATION[form.studyLevel ?? ""] ?? "secondary";
  const goals = form.goals ?? [];
  const learning_goal = goals
    .map((goal) => GOAL_LABEL_TO_LEARNING_GOAL[goal])
    .find((goal): goal is LearningGoal => Boolean(goal)) ?? "exam_preparation";
  const subject_interests = (form.subjects ?? [])
    .map((subject) => SUBJECT_ID_TO_INTEREST[subject])
    .filter((subject): subject is SubjectInterest => Boolean(subject));

  return {
    education_level,
    learning_goal,
    subject_interests,
    goals,
    institution: form.institution?.trim() || undefined,
    programme: form.programme?.trim() || undefined,
    year_level: form.yearLevel?.trim() || undefined,
    semester: form.semester?.trim() || undefined,
    courses: form.courses?.map((course) => course.trim()).filter(Boolean),
  };
}
