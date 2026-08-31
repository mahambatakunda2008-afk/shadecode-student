import { getExperienceProfile, primaryGradeStage, type EducationStage, type ExperienceProfile } from "./experience";

export type EducationProfile = {
  educationStage?: EducationStage | null;
  grade?: number | null;
  year?: string | null;
  curriculum?: string | null;
  subjects?: string[] | null;
};

export function resolveEducationExperience(profile: EducationProfile): ExperienceProfile {
  if (profile.educationStage) return getExperienceProfile(profile.educationStage);
  if (typeof profile.grade === "number" && profile.grade >= 1 && profile.grade <= 7) {
    return getExperienceProfile(primaryGradeStage(profile.grade));
  }
  return getExperienceProfile("senior_secondary");
}
