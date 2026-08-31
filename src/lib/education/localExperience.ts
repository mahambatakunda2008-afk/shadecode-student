import { localFirstStore, type LocalEducationProfile } from "@/lib/local-first/store";
import { getExperienceProfile, primaryGradeStage, type EducationStage, type ExperienceProfile } from "./experience";

export type LocalExperience = { profile: LocalEducationProfile | null; experience: ExperienceProfile };

function normaliseStage(value?: string | null): EducationStage | null {
  if (!value) return null;
  const aliases: Record<string, EducationStage> = {
    primary: "upper_primary",
    early_primary: "early_primary",
    upper_primary: "upper_primary",
    junior_secondary: "junior_secondary",
    secondary: "senior_secondary",
    senior_secondary: "senior_secondary",
    o_level: "senior_secondary",
    a_level: "a_level",
    as_level: "a_level",
    tertiary: "tertiary",
    university: "tertiary",
    polytechnic: "tertiary",
    adult: "adult",
    professional: "adult",
  };
  return aliases[value.toLowerCase()] ?? null;
}

export function resolveLocalExperience(profile: LocalEducationProfile | null): ExperienceProfile {
  if (!profile) return getExperienceProfile(null);
  const explicit = normaliseStage(profile.educationStage);
  if (explicit) return getExperienceProfile(explicit);
  if (profile.educationGrade && profile.educationGrade >= 1 && profile.educationGrade <= 7) {
    return getExperienceProfile(primaryGradeStage(profile.educationGrade));
  }
  return getExperienceProfile(null);
}

/** Pure local read. No network/auth request is performed. */
export async function getLocalExperience(userId: string): Promise<LocalExperience> {
  const profile = await localFirstStore.getEducationProfile(userId);
  return { profile, experience: resolveLocalExperience(profile) };
}
