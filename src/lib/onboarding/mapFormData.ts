import type { OnboardingFormData, StudyLevel } from "@/types";
import type { EducationLevel, LearningGoal, SubjectInterest } from "@/types/onboarding";

const STUDY_LEVEL_TO_EDUCATION: Record<StudyLevel, EducationLevel> = {
  "early-childhood": "basic",
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
  maths: "mathematics", mathematics: "mathematics", numeracy: "mathematics", "early-numeracy": "mathematics",
  physics: "physics", chemistry: "chemistry", biology: "biology",
  english: "english", reading: "english", language: "english", "early-literacy": "english",
  history: "history", geography: "geography", "computer-science": "computer_science",
  economics: "economics", business: "business", accounting: "accounting",
  art: "art", music: "music", coding: "coding", creative: "art", discovery: "science", science: "science",
  shona: "shona", ndebele: "ndebele",
};

export interface OnboardingApiPayload {
  education_level: EducationLevel;
  study_level: StudyLevel;
  learning_goal: LearningGoal;
  subject_interests: SubjectInterest[];
  goals: string[];
  display_name?: string;
  daily_goal_minutes?: number;
  study_style?: "structured" | "flexible";
  institution?: string;
  programme?: string;
  year_level?: string;
  semester?: string;
  courses?: string[];
  curriculum_board?: string;
  syllabus_code?: string;
  language?: string;
}

export function mapOnboardingFormData(form: Partial<OnboardingFormData>): OnboardingApiPayload {
  const study_level = (form.studyLevel ?? "upper-secondary") as StudyLevel;
  const education_level = STUDY_LEVEL_TO_EDUCATION[study_level] ?? "secondary";
  const goals = form.goals ?? [];
  const learning_goal = goals.map((goal) => GOAL_LABEL_TO_LEARNING_GOAL[goal]).find((goal): goal is LearningGoal => Boolean(goal)) ?? "exam_preparation";
  const subject_interests = (form.subjects ?? []).map((subject) => SUBJECT_ID_TO_INTEREST[subject]).filter((subject): subject is SubjectInterest => Boolean(subject));

  return {
    education_level,
    study_level,
    learning_goal,
    subject_interests,
    goals,
    display_name: form.displayName?.trim() || undefined,
    daily_goal_minutes: Number.isFinite(form.dailyGoalMinutes) ? form.dailyGoalMinutes : 30,
    study_style: form.studyStyle === "structured" ? "structured" : "flexible",
    institution: form.institution?.trim() || undefined,
    programme: form.programme?.trim() || undefined,
    year_level: form.yearLevel?.trim() || undefined,
    semester: form.semester?.trim() || undefined,
    courses: form.courses?.map((course) => course.trim()).filter(Boolean),
    curriculum_board: form.curriculumBoard?.trim() || undefined,
    syllabus_code: form.syllabusCode?.trim() || undefined,
    language: form.language?.trim() || undefined,
  };
}
