export interface OfflineCurriculumKnowledgeItem {
  id: string;
  kind: string;
  code?: string;
  title: string;
  content: string;
  topicCode?: string;
  objectiveIds?: string[];
  parentId?: string;
  metadata?: Record<string, unknown>;
}

export interface OfflineCurriculumPack {
  version: 2;
  curriculumId?: string;
  board?: string;
  qualification?: string;
  level?: string;
  subject: string;
  syllabusId?: string;
  syllabusVersion?: string;
  objectives: Array<{ id?: string; code?: string; statement: string }>;
  knowledge: OfflineCurriculumKnowledgeItem[];
  promptContext?: string;
  cachedAt: string;
}

const PREFIX = "shadecode:cortex:curriculum-pack:v2:";
const MAX_CONTEXT = 24000;
const MAX_KNOWLEDGE = 1500;

function key(subject: string, board?: string, level?: string) {
  return `${PREFIX}${[board || "", level || "", subject].map(value => value.trim().toLowerCase()).join(":")}`;
}

function normalizeObjective(value: unknown): { id?: string; code?: string; statement: string } | null {
  if (typeof value === "string") return value.trim() ? { statement: value.trim() } : null;
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const statement = typeof item.statement === "string" ? item.statement.trim() : "";
  if (!statement) return null;
  return { id: typeof item.id === "string" ? item.id : undefined, code: typeof item.code === "string" ? item.code : undefined, statement };
}

function normalizeKnowledge(value: unknown): OfflineCurriculumKnowledgeItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== "string" || typeof item.kind !== "string" || typeof item.title !== "string" || typeof item.content !== "string") return null;
  return {
    id: item.id, kind: item.kind, code: typeof item.code === "string" ? item.code : undefined,
    title: item.title.trim(), content: item.content.trim(), topicCode: typeof item.topicCode === "string" ? item.topicCode : undefined,
    objectiveIds: Array.isArray(item.objectiveIds) ? item.objectiveIds.filter((x): x is string => typeof x === "string").slice(0, 50) : undefined,
    parentId: typeof item.parentId === "string" ? item.parentId : undefined,
    metadata: item.metadata && typeof item.metadata === "object" ? item.metadata as Record<string, unknown> : undefined,
  };
}

function normalizePack(value: Partial<OfflineCurriculumPack>): OfflineCurriculumPack | null {
  if (value?.version !== 2 || typeof value.subject !== "string" || !Array.isArray(value.objectives) || !Array.isArray(value.knowledge)) return null;
  return {
    version: 2, curriculumId: value.curriculumId, board: value.board, qualification: value.qualification, level: value.level,
    subject: value.subject, syllabusId: value.syllabusId, syllabusVersion: value.syllabusVersion,
    objectives: value.objectives.map(normalizeObjective).filter((x): x is { id?: string; code?: string; statement: string } => Boolean(x)).slice(0, 500),
    knowledge: value.knowledge.map(normalizeKnowledge).filter((x): x is OfflineCurriculumKnowledgeItem => Boolean(x)).slice(0, MAX_KNOWLEDGE),
    promptContext: typeof value.promptContext === "string" ? value.promptContext.slice(0, MAX_CONTEXT) : undefined,
    cachedAt: typeof value.cachedAt === "string" ? value.cachedAt : new Date(0).toISOString(),
  };
}

export function readOfflineCurriculumPack(subject: string, board?: string, level?: string): OfflineCurriculumPack | null {
  if (typeof window === "undefined") return null;
  try {
    const exact = localStorage.getItem(key(subject, board, level));
    const parsed = exact ? normalizePack(JSON.parse(exact) as Partial<OfflineCurriculumPack>) : null;
    if (parsed) return parsed;
    if (board || level) return null;
    const prefix = PREFIX;
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (!storageKey?.startsWith(prefix)) continue;
      const candidate = normalizePack(JSON.parse(localStorage.getItem(storageKey) || "null") as Partial<OfflineCurriculumPack>);
      if (candidate?.subject.trim().toLowerCase() === subject.trim().toLowerCase()) return candidate;
    }
    return null;
  } catch { return null; }
}

export function writeOfflineCurriculumPack(pack: Omit<OfflineCurriculumPack, "version" | "cachedAt">) {
  if (typeof window === "undefined" || !pack.subject.trim()) return;
  try {
    const value: OfflineCurriculumPack = {
      ...pack, version: 2,
      objectives: pack.objectives.map(normalizeObjective).filter((x): x is { id?: string; code?: string; statement: string } => Boolean(x)).slice(0, 500),
      knowledge: pack.knowledge.map(normalizeKnowledge).filter((x): x is OfflineCurriculumKnowledgeItem => Boolean(x)).slice(0, MAX_KNOWLEDGE),
      promptContext: pack.promptContext?.slice(0, MAX_CONTEXT), cachedAt: new Date().toISOString(),
    };
    localStorage.setItem(key(pack.subject, pack.board, pack.level), JSON.stringify(value));
  } catch {}
}

function terms(topic: string) { return topic.toLowerCase().split(/[^a-z0-9]+/).filter(term => term.length > 2).slice(0, 24); }

export function buildOfflineCurriculumScope(pack: OfflineCurriculumPack | null, topic: string) {
  if (!pack) return "";
  const topicTerms = terms(topic);
  const matchingObjectives = pack.objectives.filter(objective => topicTerms.some(term => objective.statement.toLowerCase().includes(term)));
  const objectives = (matchingObjectives.length ? matchingObjectives : pack.objectives.slice(0, 12)).map(item => `- ${item.code ? `[${item.code}] ` : ""}${item.statement}`).join("\n");
  const matchingKnowledge = pack.knowledge.map(item => ({ item, score: topicTerms.reduce((n, term) => n + (`${item.kind} ${item.title} ${item.content} ${item.topicCode || ""}`.toLowerCase().includes(term) ? 1 : 0), 0) })).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 120).map(x => `- ${x.item.kind}: ${x.item.code ? `[${x.item.code}] ` : ""}${x.item.title}${x.item.content ? ` | ${x.item.content.slice(0, 600)}` : ""}`).join("\n");
  return `OFFLINE VERIFIED CURRICULUM PACK\nBoard: ${pack.board || "not specified"}\nQualification: ${pack.qualification || "not specified"}\nLevel: ${pack.level || "not specified"}\nSubject: ${pack.subject}\nSyllabus: ${pack.syllabusId || "not specified"} ${pack.syllabusVersion || ""}\nRelevant objectives:\n${objectives}\n${matchingKnowledge ? `\nRelevant verified knowledge:\n${matchingKnowledge}` : ""}${pack.promptContext ? `\n\nVerified scope context:\n${pack.promptContext.slice(0, 10000)}` : ""}\n\nTreat these objectives as the scope gate. Use only the supplied verified knowledge for offline teaching. Do not invent syllabus claims or missing assessment content.`;
}
