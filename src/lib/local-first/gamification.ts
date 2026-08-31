import type { LocalRecord } from "./types";
import { localFirstStore } from "./store";

export interface LocalXpState {
  totalXp: number;
  level: number;
  updatedAt: string;
}

export interface LocalStreakState {
  current: number;
  longest: number;
  lastStudyDate: string | null;
  updatedAt: string;
}

export interface LocalAchievementState {
  achievementId: string;
  unlockedAt: string;
  progress?: number;
}

const xpId = (userId: string) => `xp:${userId}`;
const streakId = (userId: string) => `streak:${userId}`;
const achievementId = (userId: string, id: string) => `achievement:${userId}:${id}`;

export async function getXp(userId: string): Promise<LocalXpState | null> {
  const record = await localFirstStore.get<LocalXpState>(xpId(userId));
  return record?.userId === userId && !record.deletedAt ? record.payload : null;
}

export async function awardXp(userId: string, amount: number): Promise<LocalRecord<LocalXpState>> {
  if (!userId) throw new Error("XP requires an authenticated user");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("XP amount must be positive");
  const current = await getXp(userId);
  const totalXp = Math.max(0, Math.floor((current?.totalXp ?? 0) + amount));
  const level = Math.max(1, Math.floor(Math.sqrt(totalXp / 100)) + 1);
  return localFirstStore.upsert({ id: xpId(userId), entity: "xp", userId, payload: { totalXp, level, updatedAt: new Date().toISOString() } });
}

export async function getStreak(userId: string): Promise<LocalStreakState | null> {
  const record = await localFirstStore.get<LocalStreakState>(streakId(userId));
  return record?.userId === userId && !record.deletedAt ? record.payload : null;
}

export async function recordStudyDay(userId: string, date = new Date()): Promise<LocalRecord<LocalStreakState>> {
  if (!userId) throw new Error("Streak requires an authenticated user");
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const key = day.toISOString().slice(0, 10);
  const current = await getStreak(userId);
  if (current?.lastStudyDate === key) return (await localFirstStore.get<LocalStreakState>(streakId(userId)))!;
  const previous = current?.lastStudyDate ? new Date(`${current.lastStudyDate}T00:00:00`) : null;
  const consecutive = previous && (day.getTime() - previous.getTime()) === 86400000;
  const nextCurrent = consecutive ? current!.current + 1 : 1;
  const longest = Math.max(current?.longest ?? 0, nextCurrent);
  return localFirstStore.upsert({ id: streakId(userId), entity: "streak", userId, payload: { current: nextCurrent, longest, lastStudyDate: key, updatedAt: new Date().toISOString() } });
}

export async function unlockAchievement(userId: string, id: string, progress?: number): Promise<LocalRecord<LocalAchievementState>> {
  if (!userId || !id) throw new Error("Achievement requires an authenticated user and ID");
  const existing = await localFirstStore.get<LocalAchievementState>(achievementId(userId, id));
  if (existing?.userId === userId && !existing.deletedAt) return existing;
  return localFirstStore.upsert({ id: achievementId(userId, id), entity: "achievement", userId, payload: { achievementId: id, unlockedAt: new Date().toISOString(), ...(progress === undefined ? {} : { progress }) } });
}
