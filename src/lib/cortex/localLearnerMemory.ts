export interface LocalLearnerMemory {
  version: 1;
  recentTopics: string[];
  recentMistakes: string[];
  masteredObjectives: string[];
  activeObjectives: string[];
  cachedAt: string;
}

const KEY = "shadecode:cortex:learner-memory:v1";

const empty = (): LocalLearnerMemory => ({
  version: 1,
  recentTopics: [],
  recentMistakes: [],
  masteredObjectives: [],
  activeObjectives: [],
  cachedAt: new Date().toISOString(),
});

export function readLocalLearnerMemory(): LocalLearnerMemory {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const value = JSON.parse(raw) as Partial<LocalLearnerMemory>;
    return {
      version: 1,
      recentTopics: Array.isArray(value.recentTopics) ? value.recentTopics.slice(0, 12) : [],
      recentMistakes: Array.isArray(value.recentMistakes) ? value.recentMistakes.slice(0, 12) : [],
      masteredObjectives: Array.isArray(value.masteredObjectives) ? value.masteredObjectives.slice(0, 30) : [],
      activeObjectives: Array.isArray(value.activeObjectives) ? value.activeObjectives.slice(0, 20) : [],
      cachedAt: typeof value.cachedAt === "string" ? value.cachedAt : new Date().toISOString(),
    };
  } catch { return empty(); }
}

export function writeLocalLearnerMemory(memory: LocalLearnerMemory) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify({ ...memory, version: 1, cachedAt: new Date().toISOString() })); } catch {}
}

export function rememberLocalTopic(topic: string) {
  const memory = readLocalLearnerMemory();
  const value = topic.trim();
  if (!value) return memory;
  writeLocalLearnerMemory({ ...memory, recentTopics: [value, ...memory.recentTopics.filter(item => item.toLowerCase() !== value.toLowerCase())].slice(0, 12) });
  return readLocalLearnerMemory();
}

export function buildLocalLearnerContext(memory = readLocalLearnerMemory()) {
  return `LOCAL LEARNER MEMORY\nRecent topics: ${memory.recentTopics.join(", ") || "none"}\nActive objectives: ${memory.activeObjectives.join(" | ") || "none"}\nMastered objectives: ${memory.masteredObjectives.join(" | ") || "none"}\nRecent mistakes: ${memory.recentMistakes.join(" | ") || "none"}\nUse this only to adapt sequencing and practice. Never treat memory as authoritative curriculum content.`;
}
