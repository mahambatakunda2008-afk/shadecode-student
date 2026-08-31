import type { LocalRecord } from "./types";
import { localFirstStore } from "./store";

export interface LocalStudyState { activeSessionId: string | null; startedAt: string | null; subjectId: string | null; lessonId: string | null; elapsedSeconds: number; updatedAt: string; }
export interface LocalStudySession { sessionId: string; subjectId?: string; lessonId?: string; startedAt: string; endedAt: string; durationSeconds: number; source: "focus" | "learn" | "exam" | "manual"; }

const stateId = (userId: string) => `study_state:${userId}`;
const sessionId = (userId: string, id: string) => `study_session:${userId}:${id}`;
function requireUser(userId: string): void { if (!userId) throw new Error("Study state requires an authenticated user"); }

export async function getStudyState(userId: string): Promise<LocalStudyState | null> {
  requireUser(userId);
  const record = await localFirstStore.get<LocalStudyState>(stateId(userId));
  return record?.userId === userId && !record.deletedAt ? record.payload : null;
}

export async function setStudyState(userId: string, patch: Partial<LocalStudyState>): Promise<LocalRecord<LocalStudyState>> {
  requireUser(userId);
  const current = await getStudyState(userId);
  const payload: LocalStudyState = {
    activeSessionId: current?.activeSessionId ?? null,
    startedAt: current?.startedAt ?? null,
    subjectId: current?.subjectId ?? null,
    lessonId: current?.lessonId ?? null,
    elapsedSeconds: Math.max(0, Math.floor(patch.elapsedSeconds ?? current?.elapsedSeconds ?? 0)),
    updatedAt: new Date().toISOString(),
    ...patch,
  };
  payload.elapsedSeconds = Math.max(0, Math.floor(payload.elapsedSeconds));
  return localFirstStore.upsert({ id: stateId(userId), entity: "study_state", userId, payload });
}

export async function startStudySession(userId: string, input: { sessionId: string; subjectId?: string; lessonId?: string; startedAt?: string }): Promise<LocalRecord<LocalStudyState>> {
  requireUser(userId);
  if (!input.sessionId) throw new Error("Study session requires an ID");
  const startedAt = input.startedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(startedAt))) throw new Error("Study session has an invalid start time");
  return setStudyState(userId, { activeSessionId: input.sessionId, startedAt, subjectId: input.subjectId ?? null, lessonId: input.lessonId ?? null, elapsedSeconds: 0 });
}

export async function finishStudySession(userId: string, session: LocalStudySession): Promise<LocalRecord<LocalStudySession>> {
  requireUser(userId);
  if (!session.sessionId) throw new Error("Study session requires an ID");
  const durationSeconds = Math.max(0, Math.floor(session.durationSeconds));
  if (!Number.isFinite(Date.parse(session.startedAt)) || !Number.isFinite(Date.parse(session.endedAt))) throw new Error("Study session has an invalid timestamp");
  const record = await localFirstStore.upsert({ id: sessionId(userId, session.sessionId), entity: "study_session", userId, payload: { ...session, durationSeconds } });
  const current = await getStudyState(userId);
  if (current?.activeSessionId === session.sessionId) await setStudyState(userId, { activeSessionId: null, startedAt: null, subjectId: null, lessonId: null, elapsedSeconds: 0 });
  return record;
}

export async function getStudySession(userId: string, id: string): Promise<LocalStudySession | null> {
  requireUser(userId);
  if (!id) return null;
  const record = await localFirstStore.get<LocalStudySession>(sessionId(userId, id));
  return record?.userId === userId && !record.deletedAt ? record.payload : null;
}
