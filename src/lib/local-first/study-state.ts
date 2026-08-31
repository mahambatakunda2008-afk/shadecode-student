import type { LocalRecord } from "./types";
import { localFirstStore } from "./store";

export interface LocalStudyState {
  activeSessionId: string | null;
  startedAt: string | null;
  subjectId: string | null;
  lessonId: string | null;
  elapsedSeconds: number;
  updatedAt: string;
}

export interface LocalStudySession {
  sessionId: string;
  subjectId?: string;
  lessonId?: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  source: "focus" | "learn" | "exam" | "manual";
}

const stateId = (userId: string) => `study_state:${userId}`;
const sessionId = (userId: string, id: string) => `study_session:${userId}:${id}`;

export async function getStudyState(userId: string): Promise<LocalStudyState | null> {
  const record = await localFirstStore.get<LocalStudyState>(stateId(userId));
  return record?.userId === userId && !record.deletedAt ? record.payload : null;
}

export async function setStudyState(userId: string, patch: Partial<LocalStudyState>): Promise<LocalRecord<LocalStudyState>> {
  if (!userId) throw new Error("Study state requires an authenticated user");
  const current = await getStudyState(userId);
  const payload: LocalStudyState = {
    activeSessionId: current?.activeSessionId ?? null,
    startedAt: current?.startedAt ?? null,
    subjectId: current?.subjectId ?? null,
    lessonId: current?.lessonId ?? null,
    elapsedSeconds: current?.elapsedSeconds ?? 0,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  return localFirstStore.upsert({ id: stateId(userId), entity: "study_state", userId, payload });
}

export async function finishStudySession(userId: string, session: LocalStudySession): Promise<LocalRecord<LocalStudySession>> {
  if (!userId || !session.sessionId) throw new Error("Study session requires an authenticated user and session ID");
  const durationSeconds = Math.max(0, Math.floor(session.durationSeconds));
  const record = await localFirstStore.upsert({
    id: sessionId(userId, session.sessionId),
    entity: "study_session",
    userId,
    payload: { ...session, durationSeconds },
  });
  const current = await getStudyState(userId);
  if (current?.activeSessionId === session.sessionId) {
    await setStudyState(userId, { activeSessionId: null, startedAt: null, elapsedSeconds: 0 });
  }
  return record;
}
