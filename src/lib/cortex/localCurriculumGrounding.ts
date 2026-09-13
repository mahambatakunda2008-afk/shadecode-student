import type { OfflineCurriculumPack } from "@/lib/cortex/offlineCurriculumPack";

const CACHE_PREFIX = "shadecode:cortex:curriculum-grounding:v2:";
const MAX_CONTEXT_CHARS = 24000;

export interface LocalCurriculumGrounding {
  status: "resolved" | "enrichment" | "blocked";
  reason: string;
  promptContext: string;
  pack?: OfflineCurriculumPack;
}

function key(subject: string, topic: string) {
  return `${CACHE_PREFIX}${subject.trim().toLowerCase()}:${topic.trim().toLowerCase()}`;
}

function readValue(subject: string, topic: string): LocalCurriculumGrounding | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(subject, topic));
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<LocalCurriculumGrounding>;
    if (typeof value.promptContext !== "string" || !value.promptContext.trim()) return null;
    return {
      status: value.status === "blocked" || value.status === "enrichment" ? value.status : "resolved",
      reason: typeof value.reason === "string" ? value.reason : "Cached verified curriculum grounding.",
      promptContext: value.promptContext.slice(0, MAX_CONTEXT_CHARS),
      pack: value.pack && typeof value.pack === "object" ? value.pack as OfflineCurriculumPack : undefined,
    };
  } catch { return null; }
}

export function readLocalCurriculumGrounding(subject: string, topic: string): string | null {
  return readValue(subject, topic)?.promptContext ?? null;
}

export function readLocalCurriculumGroundingData(subject: string, topic: string): LocalCurriculumGrounding | null {
  return readValue(subject, topic);
}

export function writeLocalCurriculumGrounding(subject: string, topic: string, data: LocalCurriculumGrounding) {
  if (typeof window === "undefined" || !data.promptContext.trim()) return;
  try {
    localStorage.setItem(key(subject, topic), JSON.stringify({
      ...data,
      promptContext: data.promptContext.slice(0, MAX_CONTEXT_CHARS),
      cachedAt: new Date().toISOString(),
    }));
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
    const data = await response.json() as Partial<LocalCurriculumGrounding>;
    if ((data.status !== "resolved" && data.status !== "enrichment") || typeof data.promptContext !== "string" || !data.promptContext.trim()) return null;
    writeLocalCurriculumGrounding(subject, topic, {
      status: data.status,
      reason: typeof data.reason === "string" ? data.reason : "Verified curriculum grounding resolved.",
      promptContext: data.promptContext,
      pack: data.pack,
    });
    return data.promptContext.slice(0, MAX_CONTEXT_CHARS);
  } catch { return null; }
}
