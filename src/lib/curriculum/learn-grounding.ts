import type { CurriculumKnowledgeItem } from "./knowledge";

export interface LearnCurriculumGrounding {
  blocked: boolean;
  reason: string;
  topic: string;
  knowledgeIds: string[];
  items: CurriculumKnowledgeItem[];
}

export interface CurriculumTopicResolution {
  input: string;
  topic: string;
  matched: boolean;
  confidence: number;
  knowledgeId?: string;
}

const PRIORITY_KINDS = new Set([
  "topic", "content_scope", "learning_outcome", "prerequisite",
  "assessment_requirement", "terminology", "practical_activity", "skill",
  "objective", "competency", "examination_format",
]);

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function tokens(value: string): string[] {
  return normalize(value).split(" ").filter((term) => term.length > 2);
}

function editSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    for (let j = 0; j < current.length; j += 1) previous[j] = current[j];
  }
  return 1 - previous[b.length] / Math.max(a.length, b.length);
}

function scoreCandidate(query: string, candidate: string): number {
  const q = normalize(query);
  const c = normalize(candidate);
  if (!q || !c) return 0;
  if (q === c) return 1;
  if (c.includes(q) || q.includes(c)) return 0.92;

  const qTerms = tokens(q);
  const cTerms = tokens(c);
  if (!qTerms.length || !cTerms.length) return editSimilarity(q, c);

  const matched = qTerms.filter((term) => cTerms.some((candidateTerm) => {
    if (candidateTerm === term) return true;
    if (candidateTerm.startsWith(term) || term.startsWith(candidateTerm)) return true;
    return editSimilarity(term, candidateTerm) >= (Math.min(term.length, candidateTerm.length) <= 5 ? 0.78 : 0.72);
  })).length;

  const overlap = matched / qTerms.length;
  const phraseSimilarity = editSimilarity(q, c);
  return Math.max(overlap * 0.82, phraseSimilarity * 0.78);
}

/**
 * Resolves a learner's free-text topic against the exact verified curriculum data.
 * This is deliberately data-driven: no topic names or typo dictionaries live here.
 */
export function resolveCurriculumTopic(topic: string, items: CurriculumKnowledgeItem[]): CurriculumTopicResolution {
  const input = topic.trim();
  const verified = items.filter((item) => item.status === "verified" && item.provenance.mappingStatus === "verified");
  if (!input || !verified.length) return { input, topic: input, matched: false, confidence: 0 };

  const candidates = verified.flatMap((item) => [
    { label: item.title, item },
    ...(item.topicCode ? [{ label: item.topicCode, item }] : []),
    ...(item.code ? [{ label: item.code, item }] : []),
  ]);

  const scored = candidates.map((candidate) => {
    const score = scoreCandidate(input, candidate.label) + (PRIORITY_KINDS.has(candidate.item.kind) ? 0.015 : 0);
    return { ...candidate, score };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  const second = scored[1];
  if (!best || best.score < 0.72) return { input, topic: input, matched: false, confidence: best?.score || 0 };

  // Require a meaningful lead when fuzzy matching, preventing a vague query from
  // silently becoming an unrelated syllabus topic.
  if (second && best.score - second.score < 0.035 && normalize(best.label) !== normalize(input)) {
    return { input, topic: input, matched: false, confidence: best.score };
  }

  return {
    input,
    topic: best.item.title,
    matched: true,
    confidence: Math.min(best.score, 1),
    knowledgeId: best.item.id,
  };
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
  if (score > 0 && PRIORITY_KINDS.has(item.kind)) score += 4;
  return score;
}

/** Selects verified syllabus knowledge for one Learn topic. */
export function buildLearnCurriculumGrounding(topic: string, items: CurriculumKnowledgeItem[]): LearnCurriculumGrounding {
  const verified = items.filter((item) => item.status === "verified" && item.provenance.mappingStatus === "verified");
  if (!verified.length) return { blocked: true, reason: "No verified curriculum knowledge is available.", topic, knowledgeIds: [], items: [] };

  const resolved = resolveCurriculumTopic(topic, verified);
  const effectiveTopic = resolved.matched ? resolved.topic : topic;
  const scored = verified.map((item) => ({ item, score: scoreItem(item, effectiveTopic) })).sort((a, b) => b.score - a.score);
  const matched = scored.filter(({ score }) => score > 0).slice(0, 24).map(({ item }) => item);
  if (!matched.length) {
    return { blocked: false, reason: "Topic is not explicitly mapped in the verified syllabus; treat it as enrichment unless the learner selects a verified syllabus topic.", topic: effectiveTopic, knowledgeIds: [], items: [] };
  }

  const related = verified
    .filter((item) => matched.some((m) => m.id === item.id || (m.parentId && item.parentId === m.parentId) || (m.topicCode && item.topicCode === m.topicCode)))
    .filter((item) => !matched.some((m) => m.id === item.id))
    .sort((a, b) => scoreItem(b, effectiveTopic) - scoreItem(a, effectiveTopic))
    .slice(0, 40);
  const selected = [...matched, ...related].slice(0, 60);
  return { blocked: false, reason: "Verified curriculum knowledge resolved for the requested Learn topic.", topic: effectiveTopic, knowledgeIds: selected.map((item) => item.id), items: selected };
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
