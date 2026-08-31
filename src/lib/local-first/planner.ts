import type { LocalRecord } from "./types";
import { localFirstStore } from "./store";

export interface LocalGoal {
  goalId: string;
  title: string;
  description?: string;
  targetDate?: string;
  targetValue?: number;
  currentValue?: number;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocalTimetableEntry {
  entryId: string;
  subjectId?: string;
  lessonId?: string;
  title: string;
  startAt: string;
  endAt: string;
  recurrence?: "none" | "daily" | "weekdays" | "weekly";
  completed: boolean;
  updatedAt: string;
}

const goalKey = (userId: string, goalId: string) => `goal:${userId}:${goalId}`;
const timetableKey = (userId: string, entryId: string) => `timetable:${userId}:${entryId}`;

function requireUser(userId: string, label: string): void {
  if (!userId) throw new Error(`${label} requires an authenticated user`);
}

export async function getGoal(userId: string, id: string): Promise<LocalGoal | null> {
  requireUser(userId, "Goal");
  if (!id) return null;
  const record = await localFirstStore.get<LocalGoal>(goalKey(userId, id));
  return record?.userId === userId && !record.deletedAt ? record.payload : null;
}

export async function saveGoal(userId: string, goal: LocalGoal): Promise<LocalRecord<LocalGoal>> {
  requireUser(userId, "Goal");
  if (!goal.goalId || !goal.title.trim()) throw new Error("Goal requires an ID and title");
  const now = new Date().toISOString();
  return localFirstStore.upsert({
    id: goalKey(userId, goal.goalId),
    entity: "goal",
    userId,
    payload: { ...goal, title: goal.title.trim(), createdAt: goal.createdAt || now, updatedAt: now },
  });
}

export async function removeGoal(userId: string, goalId: string): Promise<void> {
  requireUser(userId, "Goal");
  if (!goalId) return;
  await localFirstStore.remove({ id: goalKey(userId, goalId), entity: "goal", userId });
}

export async function getTimetableEntry(userId: string, id: string): Promise<LocalTimetableEntry | null> {
  requireUser(userId, "Timetable");
  if (!id) return null;
  const record = await localFirstStore.get<LocalTimetableEntry>(timetableKey(userId, id));
  return record?.userId === userId && !record.deletedAt ? record.payload : null;
}

export async function saveTimetableEntry(userId: string, entry: LocalTimetableEntry): Promise<LocalRecord<LocalTimetableEntry>> {
  requireUser(userId, "Timetable");
  if (!entry.entryId || !entry.title.trim()) throw new Error("Timetable entry requires an ID and title");
  const now = new Date().toISOString();
  const start = Date.parse(entry.startAt);
  const end = Date.parse(entry.endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error("Timetable entry has an invalid time range");
  return localFirstStore.upsert({
    id: timetableKey(userId, entry.entryId),
    entity: "timetable",
    userId,
    payload: { ...entry, title: entry.title.trim(), updatedAt: now },
  });
}

export async function removeTimetableEntry(userId: string, entryId: string): Promise<void> {
  requireUser(userId, "Timetable");
  if (!entryId) return;
  await localFirstStore.remove({ id: timetableKey(userId, entryId), entity: "timetable", userId });
}
