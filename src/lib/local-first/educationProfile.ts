import { localFirstDB } from "./db";
import type { LocalRecord } from "./types";
import { resolveExperienceFromProfile, type EducationProfile } from "@/lib/education/localProfile";

export type LocalEducationProfile = EducationProfile & { syncedAt?: number };
const idFor = (userId: string) => `education_profile:${userId}`;

export async function saveLocalEducationProfile(userId: string, profile: EducationProfile): Promise<LocalRecord<LocalEducationProfile>> {
  if (!userId) throw new Error("Education profile requires an authenticated user");
  const deviceId = await localFirstDB.getOrCreateDeviceId(() => crypto.randomUUID());
  return localFirstDB.mutateRecord({ id: idFor(userId), entity: "education_profile", entityId: idFor(userId), userId, payload: profile, deviceId });
}

export async function getLocalEducationProfile(userId: string): Promise<LocalEducationProfile | null> {
  if (!userId) return null;
  const record = await localFirstDB.getRecord<LocalEducationProfile>(idFor(userId));
  if (!record || record.userId !== userId || record.deletedAt) return null;
  return record.payload;
}

export async function getLocalEducationExperience(userId: string) {
  const profile = await getLocalEducationProfile(userId);
  return profile ? resolveExperienceFromProfile(profile) : null;
}
