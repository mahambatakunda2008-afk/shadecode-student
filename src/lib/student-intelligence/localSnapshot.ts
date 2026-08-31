import type { StudentIntelligence } from "./types";

const PREFIX = "shadecode:student-intelligence:v1:";

function key(userId: string) {
  return `${PREFIX}${encodeURIComponent(userId)}`;
}

/**
 * Small device-local snapshot layer for the dashboard intelligence object.
 * It deliberately has no network dependency and is safe to use from SSR
 * callers because every storage access is guarded by `window`.
 */
export function readStudentIntelligenceSnapshot(userId: string): StudentIntelligence | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = window.localStorage.getItem(key(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudentIntelligence;
    if (!parsed || parsed.userId !== userId || !parsed.progress || !parsed.performance || !parsed.activity || !parsed.intelligence) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStudentIntelligenceSnapshot(snapshot: StudentIntelligence): void {
  if (typeof window === "undefined" || !snapshot.userId) return;
  try {
    window.localStorage.setItem(key(snapshot.userId), JSON.stringify(snapshot));
  } catch {
    // Quota/private-mode failures must never prevent the dashboard rendering.
  }
}

export function clearStudentIntelligenceSnapshot(userId: string): void {
  if (typeof window === "undefined" || !userId) return;
  try { window.localStorage.removeItem(key(userId)); } catch { /* best effort */ }
}
