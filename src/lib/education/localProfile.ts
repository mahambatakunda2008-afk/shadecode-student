import { localFirstStore, type LocalEducationProfile } from "@/lib/local-first/store";
import { getExperienceProfile, primaryGradeStage, type ExperienceProfile } from "./experience";

export function resolveExperienceFromProfile(profile: LocalEducationProfile | null): ExperienceProfile {
  if (profile?.educationStage) return getExperienceProfile(profile.educationStage);
  if (typeof profile?.educationGrade === "number" && profile.educationGrade >= 1 && profile.educationGrade <= 7) {
    return getExperienceProfile(primaryGradeStage(profile.educationGrade));
  }
  return getExperienceProfile("senior_secondary");
}

/** Device-first profile read. Network hydration is intentionally outside this helper. */
export async function getLocalExperienceProfile(userId: string): Promise<{ profile: LocalEducationProfile | null; experience: ExperienceProfile }> {
  const profile = await localFirstStore.getEducationProfile(userId);
  return { profile, experience: resolveExperienceFromProfile(profile) };
}
