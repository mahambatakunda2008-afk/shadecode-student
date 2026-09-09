import type { OnboardingFormData, StudyLevel } from "@/types";
import type { EducationLevel, LearningGoal, SubjectInterest } from "@/types/onboarding";

const STUDY_LEVEL_TO_EDUCATION: Record<StudyLevel, EducationLevel> = {
  "early-childhood": "basic", primary: "basic", "lower-secondary": "secondary", "upper-secondary": "secondary",
  "a-level": "secondary", university: "university", tvet: "tvet", professional: "tvet",
};

const GOAL_LABEL_TO_LEARNING_GOAL: Record<string, LearningGoal> = {
  "Pass school exams": "exam_preparation", "Improve grades": "exam_preparation", "Prepare for university": "exam_preparation",
  "Learn a new skill": "skill_development", "Build projects": "skill_development", "Get a job": "career_building",
  "Change careers": "career_building", "Explore interests": "exploration",
};

const SUBJECT_ID_TO_INTEREST: Record<string, SubjectInterest> = {
  maths: "mathematics", mathematics: "mathematics", numeracy: "mathematics", "early-numeracy": "mathematics",
  physics: "physics", chemistry: "chemistry", biology: "biology", english: "english", reading: "english", language: "english", "early-literacy": "english",
  history: "history", geography: "geography", "computer-science": "computer_science", economics: "economics", business: "business", accounting: "accounting",
  art: "art", music: "music", coding: "coding", creative: "art", discovery: "science", science: "science", shona: "shona", ndebele: "ndebele",
};

export interface OnboardingCurriculumSubject {
  boardId: string;
  qualificationId: string;
  level: string;
  syllabusId: string;
  syllabusVersion: string;
  subjectId: string;
  subjectName: string;
  paperOrComponentId?: string;
  examSession?: string;
}

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
  curriculum_qualification?: string;
  curriculum_level?: string;
  syllabus_code?: string;
  syllabus_year?: string;
  language?: string;
  curriculum_profile?: Record<string, unknown>;
  curriculum_subjects?: OnboardingCurriculumSubject[];
}

function slug(value: string): string { return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function subjectLabel(subjectId: string): string { return subjectId.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function boardIdFor(value: string): string { const id = slug(value); return id === "cambridge-international" ? "cambridge" : id; }

function buildExactCurriculumSubjects(form: Partial<OnboardingFormData>): OnboardingCurriculumSubject[] {
  const boardId = boardIdFor(form.curriculumBoard ?? "");
  const qualificationId = slug(form.curriculumQualification ?? "");
  const level = slug(form.curriculumLevel ?? "");
  const syllabusVersion = form.syllabusVersion?.trim() ?? "";
  const subjects = form.subjects ?? [];
  const codes = form.curriculumSubjectCodes ?? {};

  if (!boardId || boardId === "unknown" || boardId === "other-not-listed" || boardId === "i-don-t-know-yet" || !qualificationId || !level || !syllabusVersion || !subjects.length) return [];

  return subjects.flatMap((subjectId) => {
    const perSubjectCode = codes[subjectId]?.trim();
    const commonCode = subjects.length === 1 ? form.syllabusCode?.trim() : "";
    const syllabusId = slug(perSubjectCode || commonCode || "");
    if (!syllabusId) return [];
    return [{
      boardId, qualificationId, level, syllabusId, syllabusVersion,
      subjectId: slug(subjectId), subjectName: subjectLabel(subjectId),
      paperOrComponentId: form.curriculumPaperComponents?.[subjectId]?.trim() || undefined,
      examSession: form.curriculumExamSession?.trim() || undefined,
    }];
  });
}

function buildCurriculumAnswers(form: Partial<OnboardingFormData>): Record<string, unknown> | undefined {
  const answers: Record<string, unknown> = {
    board: form.curriculumBoard?.trim() || null,
    qualification: form.curriculumQualification?.trim() || null,
    level: form.curriculumLevel?.trim() || null,
    syllabusVersion: form.syllabusVersion?.trim() || null,
    subjectCodes: form.curriculumSubjectCodes ?? {},
    examSession: form.curriculumExamSession?.trim() || null,
  };
  const hasAnswer = Object.values(answers).some((value) => value && (typeof value !== "object" || Object.keys(value).length > 0));
  return hasAnswer ? answers : undefined;
}

export function mapOnboardingFormData(form: Partial<OnboardingFormData>): OnboardingApiPayload {
  const study_level = (form.studyLevel ?? "upper-secondary") as StudyLevel;
  const education_level = STUDY_LEVEL_TO_EDUCATION[study_level] ?? "secondary";
  const goals = form.goals ?? [];
  const learning_goal = goals.map((goal) => GOAL_LABEL_TO_LEARNING_GOAL[goal]).find((goal): goal is LearningGoal => Boolean(goal)) ?? "exam_preparation";
  const subject_interests = (form.subjects ?? []).map((subject) => SUBJECT_ID_TO_INTEREST[subject]).filter((subject): subject is SubjectInterest => Boolean(subject));

  return {
    education_level, study_level, learning_goal, subject_interests, goals,
    display_name: form.displayName?.trim() || undefined,
    daily_goal_minutes: Number.isFinite(form.dailyGoalMinutes) ? form.dailyGoalMinutes : 30,
    study_style: form.studyStyle === "structured" ? "structured" : "flexible",
    institution: form.institution?.trim() || undefined,
    programme: form.programme?.trim() || undefined,
    year_level: form.yearLevel?.trim() || undefined,
    semester: form.semester?.trim() || undefined,
    courses: form.courses?.map((course) => course.trim()).filter(Boolean),
    curriculum_board: form.curriculumBoard?.trim() || undefined,
    curriculum_qualification: form.curriculumQualification?.trim() || undefined,
    curriculum_level: form.curriculumLevel?.trim() || undefined,
    syllabus_code: form.syllabusCode?.trim() || undefined,
    syllabus_year: form.syllabusVersion?.trim() || undefined,
    language: form.language?.trim() || undefined,
    curriculum_profile: buildCurriculumAnswers(form),
    curriculum_subjects: buildExactCurriculumSubjects(form),
  };
}
