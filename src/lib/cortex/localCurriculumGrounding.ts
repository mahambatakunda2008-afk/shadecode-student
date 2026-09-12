const CACHE_PREFIX = "shadecode:cortex:curriculum-grounding:v1:";
const MAX_CONTEXT_CHARS = 24000;

export function readLocalCurriculumGrounding(subject: string, topic: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${subject.trim().toLowerCase()}:${topic.trim().toLowerCase()}`);
    if (!raw) return null;
    const value = JSON.parse(raw) as { promptContext?: unknown };
    return typeof value.promptContext === "string" && value.promptContext.trim()
      ? value.promptContext.slice(0, MAX_CONTEXT_CHARS)
      : null;
  } catch {
    return null;
  }
}

export function writeLocalCurriculumGrounding(subject: string, topic: string, promptContext: string) {
  if (typeof window === "undefined" || !promptContext.trim()) return;
  try {
    window.localStorage.setItem(`${CACHE_PREFIX}${subject.trim().toLowerCase()}:${topic.trim().toLowerCase()}`, JSON.stringify({ promptContext: promptContext.slice(0, MAX_CONTEXT_CHARS), cachedAt: new Date().toISOString() }));
  } catch {}
}

export async function getLocalCurriculumGrounding(subject: string, topic: string): Promise<string | null> {
  const cached = readLocalCurriculumGrounding(subject, topic);
  if (cached) return cached;
  if (typeof window === "undefined" || !navigator.onLine) return null;
  try {
    const query = new URLSearchParams({ subject: subject.trim(), topic: topic.trim() });
    const response = await fetch(`/api/curriculum/grounding?${query.toString()}`, { cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json() as { status?: string; promptContext?: unknown };
    if (data.status !== "resolved" || typeof data.promptContext !== "string" || !data.promptContext.trim()) return null;
    writeLocalCurriculumGrounding(subject, topic, data.promptContext);
    return data.promptContext.slice(0, MAX_CONTEXT_CHARS);
  } catch {
    return null;
  }
}
