import type { StudySessionState, StudySpaceMode, WorkObject } from "./types";

export type PersistedStudySession = {
  session: StudySessionState;
  work: WorkObject;
};

export function createPersistedSession(
  work: WorkObject,
  mode: StudySpaceMode,
  remainingMs?: number,
): PersistedStudySession {
  const now = new Date().toISOString();
  return {
    work,
    session: {
      workId: work.id,
      mode,
      status: "active",
      startedAt: work.createdAt || now,
      updatedAt: now,
      remainingMs,
    },
  };
}

export function updatePersistedSession(
  persisted: PersistedStudySession,
  patch: Partial<Pick<WorkObject, "response" | "working" | "attachments" | "updatedAt">> &
    Partial<Pick<StudySessionState, "status" | "remainingMs">>,
): PersistedStudySession {
  const now = new Date().toISOString();
  const { status, remainingMs, ...workPatch } = patch;
  return {
    work: { ...persisted.work, ...workPatch, updatedAt: now },
    session: {
      ...persisted.session,
      ...(status ? { status } : {}),
      ...(remainingMs === undefined ? {} : { remainingMs }),
      updatedAt: now,
    },
  };
}
