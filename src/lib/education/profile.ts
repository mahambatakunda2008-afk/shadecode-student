import type { EducationStage } from "./experience";
import { getExperienceProfile, primaryGradeStage, type ExperienceProfile } from "./experience";

export type LearnerEducationProfile = {
  stage: EducationStage;
  grade: number | null;
  year: string | null;
  curriculum: string | null;
  subjects: string[];
};

function normalizeStage(value: unknown, grade: number | null): EducationStage {
  if (typeof value === "string" && value in {
    early_primary: 1, upper_primary: 1, junior_secondary: 1, senior_secondary: 1,
    a_level: 1, tertiary: 1, adult: 1,
  }) return value as EducationStage;
  if (grade != null && grade >= 1 && grade <= 7) return primaryGradeStage(grade);
  return "senior_secondary";
}

export function resolveLearnerEducationProfile(input: Partial<LearnerEducationProfile> & { education_stage?: unknown; education_grade?: unknown; education_year?: unknown; education_curriculum?: unknown; education_subjects?: unknown }): LearnerEducationProfile {
  const grade = typeof input.education_grade === "number" ? input.education_grade : typeof input.grade === "number" ? input.grade : null;
  const stage = normalizeStage(input.education_stage ?? input.stage, grade);
  const subjects = Array.isArray(input.education_subjects) ? input.education_subjects.filter((s): s is string => typeof s === "string") : input.subjects ?? [];
  return {
    stage,
    grade,
    year: typeof input.education_year === "string" ? input.education_year : input.year ?? null,
    curriculum: typeof input.education_curriculum === "string" ? input.education_curriculum : input.curriculum ?? null,
    subjects,
  };
}

export function experienceForLearner(profile: LearnerEducationProfile): ExperienceProfile {
  return getExperienceProfile(profile.stage);
}
