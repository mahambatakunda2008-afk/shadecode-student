export interface OfflineCurriculumPack {
  version: 1;
  curriculumId?: string;
  board?: string;
  qualification?: string;
  level?: string;
  subject: string;
  objectives: string[];
  promptContext?: string;
  cachedAt: string;
}

const PREFIX = "shadecode:cortex:curriculum-pack:v1:";
const MAX_CONTEXT = 24000;

function key(subject: string, board?: string, level?: string) {
  return `${PREFIX}${[board || "", level || "", subject].map(value => value.trim().toLowerCase()).join(":")}`;
}

export function readOfflineCurriculumPack(subject: string, board?: string, level?: string): OfflineCurriculumPack | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key(subject, board, level));
    if (!raw) return null;
    const value = JSON.parse(raw) as OfflineCurriculumPack;
    if (value?.version !== 1 || typeof value.subject !== "string" || !Array.isArray(value.objectives)) return null;
    return { ...value, promptContext: typeof value.promptContext === "string" ? value.promptContext.slice(0, MAX_CONTEXT) : undefined };
  } catch { return null; }
}

export function writeOfflineCurriculumPack(pack: Omit<OfflineCurriculumPack, "version" | "cachedAt">) {
  if (typeof window === "undefined" || !pack.subject.trim()) return;
  try {
    const value: OfflineCurriculumPack = {
      ...pack,
      version: 1,
      objectives: pack.objectives.filter(Boolean).slice(0, 500),
      promptContext: pack.promptContext?.slice(0, MAX_CONTEXT),
      cachedAt: new Date().toISOString(),
    };
    localStorage.setItem(key(pack.subject, pack.board, pack.level), JSON.stringify(value));
  } catch {}
}

export function buildOfflineCurriculumScope(pack: OfflineCurriculumPack | null, topic: string) {
  if (!pack) return "";
  const matching = pack.objectives.filter(objective => {
    const terms = topic.toLowerCase().split(/[^a-z0-9]+/).filter(term => term.length > 2);
    const text = objective.toLowerCase();
    return terms.some(term => text.includes(term));
  });
  const objectives = (matching.length ? matching : pack.objectives.slice(0, 12)).map(item => `- ${item}`).join("\n");
  return `OFFLINE VERIFIED CURRICULUM PACK\nBoard: ${pack.board || "not specified"}\nQualification: ${pack.qualification || "not specified"}\nLevel: ${pack.level || "not specified"}\nSubject: ${pack.subject}\nRelevant objectives:\n${objectives}${pack.promptContext ? `\n\nVerified scope context:\n${pack.promptContext.slice(0, 12000)}` : ""}\n\nTreat these objectives as the scope gate. Do not invent syllabus claims.`;
}
