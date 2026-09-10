import type { CurriculumKnowledgeItem } from "./knowledge";

export interface LearnCurriculumGrounding {
  blocked: boolean;
  reason: string;
  topic: string;
  knowledgeIds: string[];
  items: CurriculumKnowledgeItem[];
}

const PRIORITY_KINDS = new Set([
  "topic", "content_scope", "learning_outcome", "prerequisite",
  "assessment_requirement", "terminology", "practical_activity", "skill",
  "objective", "competency", "examination_format",
]);

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function scoreItem(item: CurriculumKnowledgeItem, topic: string): number {
  const q = normalize(topic);
  if (!q) return 0;
  const title = normalize(item.title);
  const content = normalize(item.content);
  const terms = q.split(" ").filter((term) => term.length > 2);
  let score = 0;
  if (title === q) score += 100;
  if (title.includes(q)) score += 70;
  if (q.includes(title) && title.length >= 5) score += 55;
  if (content.includes(q)) score += 30;
  score += terms.reduce((total, term) => total + (title.includes(term) ? 8 : content.includes(term) ? 2 : 0), 0);
  if (PRIORITY_KINDS.has(item.kind)) score += 4;
  return score;
}

/** Selects verified syllabus knowledge for one Learn topic. */
export function buildLearnCurriculumGrounding(topic: string, items: CurriculumKnowledgeItem[]): LearnCurriculumGrounding {
  const verified = items.filter((item) => item.status === "verified" && item.provenance.mappingStatus === "verified");
  if (!verified.length) return { blocked: true, reason: "No verified curriculum knowledge is available.", topic, knowledgeIds: [], items: [] };

  const scored = verified.map((item) => ({ item, score: scoreItem(item, topic) })).sort((a, b) => b.score - a.score);
  const matched = scored.filter(({ score }) => score > 0).slice(0, 24).map(({ item }) => item);
  if (!matched.length) {
    return { blocked: false, reason: "Topic is not explicitly mapped in the verified syllabus; treat it as enrichment unless the learner selects a verified syllabus topic.", topic, knowledgeIds: [], items: [] };
  }

  const related = verified
    .filter((item) => matched.some((m) => m.id === item.id || (m.parentId && item.parentId === m.parentId) || (m.topicCode && item.topicCode === m.topicCode)))
    .filter((item) => !matched.some((m) => m.id === item.id))
    .sort((a, b) => scoreItem(b, topic) - scoreItem(a, topic))
    .slice(0, 40);
  const selected = [...matched, ...related].slice(0, 60);
  return { blocked: false, reason: "Verified curriculum knowledge resolved for the requested Learn topic.", topic, knowledgeIds: selected.map((item) => item.id), items: selected };
}

export function learnCurriculumPromptSection(grounding: LearnCurriculumGrounding): string {
  if (grounding.blocked) return "\n\n=== LEARN CURRICULUM GROUNDING ===\nBLOCKED: No verified syllabus knowledge is available. Do not present curriculum-specific or exam-required claims as verified.\n=== END LEARN CURRICULUM GROUNDING ===";
  if (!grounding.items.length) return [
    "\n\n=== LEARN CURRICULUM GROUNDING ===",
    `Requested topic: ${grounding.topic}`,
    "This topic has not been explicitly matched to verified syllabus knowledge.",
    "Teach only as clearly labelled enrichment. Do not claim it is required by the learner's syllabus.",
    "=== END LEARN CURRICULUM GROUNDING ===",
  ].join("\n");

  const lines = grounding.items.map((item) => {
    const code = item.code ? `[${item.code}] ` : "";
    const provenance = item.provenance.sectionOrPage ? ` | source: ${item.provenance.sectionOrPage}` : "";
    return `- ${item.kind}: ${code}${item.title}${item.content ? ` | ${item.content.slice(0, 700)}` : ""}${provenance} | knowledge_id: ${item.id}`;
  });
  return [
    "\n\n=== LEARN CURRICULUM GROUNDING ===",
    `Requested topic: ${grounding.topic}`,
    "The following verified syllabus knowledge is the authoritative scope for this lesson:",
    ...lines,
    "Teaching rules: use these items to determine scope, prerequisites, terminology, learning outcomes, practical work and assessment style. Do not add unverified material as required syllabus content. If you add useful material outside this scope, label it enrichment. Preserve the knowledge IDs internally as grounding metadata; do not expose IDs to the learner.",
    "=== END LEARN CURRICULUM GROUNDING ===",
  ].join("\n");
}
