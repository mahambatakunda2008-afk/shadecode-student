import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";
import type { AcademicExperience } from "@/lib/academic/experience";
import type { StudyLevel } from "@/types";

export type EducationProfile = {
  educationStage?: StudyLevel | string | null;
  grade?: number | null;
  year?: string | null;
  curriculum?: string | null;
  subjects?: string[] | null;
};

// Delegates to the real, existing academic-experience module (src/lib/academic/experience.ts)
// rather than a second, parallel "experience" concept -- that module already owns the
// canonical stage -> display-experience mapping used by the dashboard.
export function resolveEducationExperience(profile: EducationProfile): AcademicExperience {
  if (profile.educationStage) return getAcademicExperience(normalizeStudyLevel(profile.educationStage));
  // A 1-7 numeric grade with no explicit stage implies primary school; StudyLevel's
  // "primary" stage covers that whole range (it isn't broken down by individual grade).
  if (typeof profile.grade === "number" && profile.grade >= 1 && profile.grade <= 7) {
    return getAcademicExperience("primary");
  }
  return getAcademicExperience(null);
}
