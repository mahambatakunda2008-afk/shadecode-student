import type { StudySessionState, StudySpaceMode } from "./types";
import { deleteStudySession, getStudySession, saveStudySession } from "./store";

export function createStudySession(workId: string, mode: StudySpaceMode, remainingMs?: number): StudySessionState {
  const now = new Date().toISOString();
  return { workId, mode, status: "active", startedAt: now, updatedAt: now, remainingMs };
}

export async function pauseStudySession(session: StudySessionState): Promise<StudySessionState> {
  const next = { ...session, status: "paused" as const, updatedAt: new Date().toISOString() };
  await saveStudySession(next);
  return next;
}

export async function resumeStudySession(workId: string): Promise<StudySessionState | undefined> {
  const existing = await getStudySession(workId);
  if (!existing || existing.status === "submitted" || existing.status === "synced") return existing;
  const next = { ...existing, status: "active" as const, updatedAt: new Date().toISOString() };
  await saveStudySession(next);
  return next;
}

export async function completeStudySession(workId: string): Promise<void> {
  const existing = await getStudySession(workId);
  if (!existing) return;
  await saveStudySession({ ...existing, status: "submitted", updatedAt: new Date().toISOString() });
}

export { deleteStudySession, getStudySession, saveStudySession };
