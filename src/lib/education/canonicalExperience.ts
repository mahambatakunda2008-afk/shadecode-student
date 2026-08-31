import type { StudyLevel } from "@/types";
import { getAcademicExperience, normalizeStudyLevel, type AcademicExperience } from "@/lib/academic/experience";

export type CanonicalEducationStage = StudyLevel;

export interface LocalEducationProfileInput {
  stage?: string | null;
  educationStage?: string | null;
  grade?: string | number | null;
  educationGrade?: string | number | null;
  studyLevel?: string | null;
}

const normalizeGrade = (value: string | number | null | undefined): number | null => {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value !== "string") return null;
  const match = value.trim().match(/(?:grade|form|year)?\s*(\d{1,2})/i);
  return match ? Number(match[1]) : null;
};

/** Canonical UI experience resolver. It is pure: callers may feed local IndexedDB state. */
export function resolveCanonicalEducationStage(profile?: LocalEducationProfileInput | null): CanonicalEducationStage {
  const explicit = profile?.stage ?? profile?.educationStage ?? profile?.studyLevel;
  if (explicit) {
    const normalized = explicit.trim().toLowerCase().replace(/\s+/g, "-");
    if (normalized === "primary" || normalized === "foundation") return "primary";
    if (["lower-secondary", "junior-secondary", "jse", "form-1", "form-2"].includes(normalized)) return "lower-secondary";
    if (["upper-secondary", "senior-secondary", "olevel", "o-level"].includes(normalized)) return "upper-secondary";
    if (["a-level", "as-level", "sixth-form"].includes(normalized)) return "a-level";
    if (["university", "tertiary", "higher-education"].includes(normalized)) return "university";
    if (["tvet", "polytechnic", "vocational"].includes(normalized)) return "tvet";
    if (["professional", "adult", "adult-learning"].includes(normalized)) return "professional";
    return normalizeStudyLevel(normalized);
  }

  const grade = normalizeGrade(profile?.grade ?? profile?.educationGrade);
  if (grade !== null) {
    if (grade >= 1 && grade <= 7) return "primary";
    if (grade >= 8 && grade <= 11) return "lower-secondary";
    if (grade === 12) return "upper-secondary";
    if (grade === 13) return "a-level";
  }

  return "upper-secondary";
}

export function getCanonicalAcademicExperience(profile?: LocalEducationProfileInput | null): AcademicExperience {
  return getAcademicExperience(resolveCanonicalEducationStage(profile));
}
