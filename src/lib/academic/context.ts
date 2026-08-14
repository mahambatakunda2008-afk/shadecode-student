import type { EducationLevel, LearningGoal, SubjectInterest } from "@/types/onboarding";

export type AcademicPathway =
  | "basic"
  | "secondary"
  | "a_level"
  | "tvet"
  | "university"
  | "college"
  | "self_learning";

export type AcademicPeriodType = "term" | "semester" | "quarter" | "block" | "custom";

export type AssessmentType =
  | "assignment"
  | "quiz"
  | "test"
  | "exam"
  | "practical"
  | "lab"
  | "project"
  | "presentation"
  | "research";

export interface AcademicInstitutionContext {
  id?: string;
  name?: string;
  type?: "school" | "university" | "polytechnic" | "college" | "training_provider";
}

export interface AcademicProgrammeContext {
  id?: string;
  name?: string;
  qualification?: string;
}

export interface AcademicPeriodContext {
  id?: string;
  name?: string;
  type?: AcademicPeriodType;
  startsAt?: string;
  endsAt?: string;
}

export interface AcademicCourseContext {
  id?: string;
  code?: string;
  name: string;
  credits?: number;
  topicIds?: string[];
}

export interface AcademicAssessmentContext {
  id?: string;
  title: string;
  type: AssessmentType;
  courseId?: string;
  dueAt?: string;
  weight?: number;
}

export interface AcademicContext {
  educationLevel: EducationLevel | null;
  pathway: AcademicPathway | null;
  learningGoal: LearningGoal | null;
  subjectInterests: SubjectInterest[];
  institution: AcademicInstitutionContext | null;
  programme: AcademicProgrammeContext | null;
  period: AcademicPeriodContext | null;
  courses: AcademicCourseContext[];
  assessments: AcademicAssessmentContext[];
}

export interface AcademicProfileInput {
  education_level?: EducationLevel | null;
  learning_goal?: LearningGoal | null;
  subject_interests?: SubjectInterest[] | null;
  institution?: AcademicInstitutionContext | null;
  programme?: AcademicProgrammeContext | null;
  period?: AcademicPeriodContext | null;
  courses?: AcademicCourseContext[] | null;
  assessments?: AcademicAssessmentContext[] | null;
  /** UI-level value retained until persisted profile normalization is complete. */
  study_level?: "high-school" | "a-level" | "university" | "professional";
}

function resolvePathway(input: AcademicProfileInput): AcademicPathway | null {
  if (input.study_level === "a-level") return "a_level";
  if (input.study_level === "high-school") return "secondary";
  if (input.study_level === "university") return "university";
  if (input.study_level === "professional") return "tvet";

  switch (input.education_level) {
    case "basic":
      return "basic";
    case "secondary":
      return "secondary";
    case "tvet":
      return "tvet";
    case "university":
      return "university";
    case "self_learning":
      return "self_learning";
    default:
      return null;
  }
}

/**
 * Normalizes existing profile/onboarding vocabulary into one academic context.
 * This is intentionally non-persistent so consumers can adopt it incrementally.
 */
export function normalizeAcademicContext(input: AcademicProfileInput): AcademicContext {
  const subjectInterests = Array.from(new Set(input.subject_interests ?? []));

  return {
    educationLevel: input.education_level ?? null,
    pathway: resolvePathway(input),
    learningGoal: input.learning_goal ?? null,
    subjectInterests,
    institution: input.institution ?? null,
    programme: input.programme ?? null,
    period: input.period ?? null,
    courses: input.courses ?? [],
    assessments: input.assessments ?? [],
  };
}
