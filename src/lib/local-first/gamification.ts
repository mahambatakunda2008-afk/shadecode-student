import type { LocalRecord } from "./types";
import { localFirstStore } from "./store";

export interface LocalXpState {
  totalXp: number;
  level: number;
  updatedAt: string;
  appliedEventIds?: string[];
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

function levelForXp(totalXp: number): number {
  return Math.max(1, Math.floor(totalXp / 100) + 1);
}

export async function getXp(userId: string): Promise<LocalXpState | null> {
  const record = await localFirstStore.get<LocalXpState>(xpId(userId));
  return record?.userId === userId && !record.deletedAt ? record.payload : null;
}

/**
 * Local XP primitive. When an idempotency key is supplied, the reward is only
 * applied once for that key on the current local record. Cross-tab atomicity
 * remains a responsibility of the underlying IndexedDB transaction layer.
 */
export async function awardXp(userId: string, amount: number, idempotencyKey?: string): Promise<LocalRecord<LocalXpState>> {
  if (!userId) throw new Error("XP requires an authenticated user");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("XP amount must be positive");
  if (idempotencyKey !== undefined && !idempotencyKey.trim()) throw new Error("XP idempotency key cannot be empty");

  const current = await getXp(userId);
  const appliedEventIds = current?.appliedEventIds ?? [];
  if (idempotencyKey && appliedEventIds.includes(idempotencyKey)) {
    return (await localFirstStore.get<LocalXpState>(xpId(userId)))!;
  }

  const totalXp = Math.max(0, Math.floor((current?.totalXp ?? 0) + amount));
  const level = levelForXp(totalXp);
  const nextEventIds = idempotencyKey ? [...appliedEventIds, idempotencyKey].slice(-500) : appliedEventIds;
  return localFirstStore.upsert({
    id: xpId(userId),
    entity: "xp",
    userId,
    payload: { totalXp, level, updatedAt: new Date().toISOString(), appliedEventIds: nextEventIds },
  });
}

export async function getStreak(userId: string): Promise<LocalStreakState | null> {
  const record = await localFirstStore.get<LocalStreakState>(streakId(userId));
  return record?.userId === userId && !record.deletedAt ? record.payload : null;
}

/** Use the learner's device-local calendar day. Offline streaks should not jump at UTC midnight. */
function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayDistance(from: string, to: string): number {
  const left = Date.parse(`${from}T00:00:00Z`);
  const right = Date.parse(`${to}T00:00:00Z`);
  return Math.round((right - left) / 86400000);
}

export async function recordStudyDay(userId: string, date = new Date()): Promise<LocalRecord<LocalStreakState>> {
  if (!userId) throw new Error("Streak requires an authenticated user");
  const key = localDayKey(date);
  const current = await getStreak(userId);
  if (current?.lastStudyDate === key) return (await localFirstStore.get<LocalStreakState>(streakId(userId)))!;
  const consecutive = current?.lastStudyDate ? dayDistance(current.lastStudyDate, key) === 1 : false;
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
