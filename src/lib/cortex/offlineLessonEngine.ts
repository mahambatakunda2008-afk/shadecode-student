import type { OfflineCurriculumPack, OfflineCurriculumKnowledgeItem } from "@/lib/cortex/offlineCurriculumPack";
import { buildOfflineCurriculumScope } from "@/lib/cortex/offlineCurriculumPack";

export interface OfflineLessonBlock { [key: string]: unknown; type: string; title?: string; content: string; }
export interface OfflineLesson { id: string; title: string; blocks: OfflineLessonBlock[]; }

function clean(value: string) { return value.trim().replace(/\s+/g, " "); }
function idFor(subject: string, prompt: string) {
  const seed = `${subject}:${prompt}`.toLowerCase(); let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  return `offline-lesson-${(hash >>> 0).toString(36)}`;
}
function unique(values: string[], limit: number) { const seen = new Set<string>(); return values.filter(v => { const k = v.toLowerCase(); if (!v || seen.has(k)) return false; seen.add(k); return true; }).slice(0, limit); }
function block(type: string, title: string, content: string): OfflineLessonBlock { return { type, title, content: content.trim() }; }
function topicTerms(topic: string) { return unique(topic.toLowerCase().split(/[^a-z0-9]+/).filter(x => x.length > 2), 24); }
function relevant(items: OfflineCurriculumKnowledgeItem[], topic: string) {
  const terms = topicTerms(topic);
  return items.map(item => {
    const text = `${item.kind} ${item.title} ${item.content} ${item.topicCode || ""} ${JSON.stringify(item.metadata || {})}`.toLowerCase();
    return { item, score: terms.reduce((n, term) => n + (text.includes(term) ? 1 : 0), 0) };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).map(x => x.item).slice(0, 32);
}
function byKind(items: OfflineCurriculumKnowledgeItem[], pattern: RegExp) { return items.filter(x => pattern.test(x.kind)); }
function content(item: OfflineCurriculumKnowledgeItem) { return item.content ? `: ${clean(item.content)}` : ""; }

/** Build only from a structured verified curriculum pack. No topic-specific branches or invented subject knowledge. */
export function buildOfflineLessonFromPack(subject: string, prompt: string, topic: string, pack: OfflineCurriculumPack): OfflineLesson | null {
  if (!pack.knowledge.length || !pack.objectives.length) return null;
  const selected = relevant(pack.knowledge, topic);
  if (!selected.length) return null;
  const objectiveTerms = topicTerms(topic);
  const matchingObjectives = pack.objectives.filter(objective => objectiveTerms.some(term => objective.statement.toLowerCase().includes(term)));
  const objectiveList = (matchingObjectives.length ? matchingObjectives : pack.objectives.slice(0, 8)).map(x => `- ${x.code ? `[${x.code}] ` : ""}${x.statement}`);

  const definitions = byKind(selected, /terminology|definition|concept|content_scope|learning_outcome/i);
  const formulas = byKind(selected, /formula|equation|rule|relationship/i);
  const examples = byKind(selected, /example|worked|demonstration/i);
  const practice = byKind(selected, /assessment|question|practice|problem|examination_format/i);
  const warnings = byKind(selected, /misconception|mistake|warning|constraint|guidance/i);
  const applications = byKind(selected, /practical_activity|project_requirement|application/i);

  const blocks: OfflineLessonBlock[] = [
    block("objective", "Learning target", unique(objectiveList, 8).join("\n")),
    block("prior", "Scope", `Subject: ${subject}\nRequested topic: ${clean(topic)}\n\nOffline teaching is limited to verified curriculum knowledge available on this device.`),
  ];
  if (definitions.length) blocks.push(block("concept", "Key concepts", definitions.slice(0, 7).map(x => `- ${x.title}${content(x)}`).join("\n")));
  if (formulas.length) blocks.push(block("formula", "Rules and relationships", formulas.slice(0, 7).map(x => `- ${x.title}${content(x)}`).join("\n")));
  if (examples.length) blocks.push(block("example", "Verified examples", examples.slice(0, 4).map((x, i) => `Example ${i + 1}: ${x.title}\n${x.content || ""}`.trim()).join("\n\n")));
  if (warnings.length) blocks.push(block("misconception", "Watch for", warnings.slice(0, 5).map(x => `- ${x.title}${content(x)}`).join("\n")));
  if (applications.length) blocks.push(block("application", "Applications", applications.slice(0, 4).map(x => `- ${x.title}${content(x)}`).join("\n")));
  if (practice.length) {
    blocks.push(block("practice", "Practice", practice.slice(0, 6).map((x, i) => `${i + 1}. ${x.title}${content(x)}`).join("\n")));
    blocks.push(block("checkpoint", "Checkpoint", practice.slice(0, 3).map((x, i) => `${i + 1}. ${x.title}${content(x)}`).join("\n\n")));
  } else if (examples.length) {
    blocks.push(block("checkpoint", "Reflection", "Question: What concept or rule does the verified example demonstrate?\nThink: Explain the reasoning in your own words before checking the example again."));
  }
  blocks.push(block("summary", "What to retain", [
    `- Explain ${clean(topic)} using the verified knowledge above.`,
    "- Connect the explanation to the relevant syllabus objective.",
    practice.length ? "- Complete the verified practice before moving on." : "- Offline assessment content is not cached for this topic yet.",
  ].join("\n")));

  if (blocks.filter(x => !["objective", "prior", "summary"].includes(x.type)).length < 2) return null;
  return { id: idFor(subject, prompt), title: `${clean(topic)}: offline lesson`, blocks };
}

/** Migration fallback for older cached flattened grounding. */
export function buildOfflineLesson(subject: string, prompt: string, verifiedContext: string): OfflineLesson | null {
  if (!/VERIFIED SYLLABUS KNOWLEDGE/i.test(verifiedContext)) return null;
  const knowledgeItems: OfflineCurriculumKnowledgeItem[] = verifiedContext.split(/\r?\n/).map(line => {
    const match = line.match(/^[-*•]\s*([^:|]+):\s*(?:\[[^\]]+\]\s*)?([^|]+?)(?:\s*\|\s*(.*))?$/);
    if (!match) return null;
    return { id: `legacy-${line.length}-${match[2].trim()}`, kind: match[1].trim(), title: match[2].trim(), content: match[3]?.trim() || "" };
  }).filter((x): x is OfflineCurriculumKnowledgeItem => Boolean(x));
  const objectiveLines = verifiedContext.split(/\r?\n/).filter(line => /^[-*•]\s/.test(line)).map(line => line.replace(/^[-*•]\s*/, "").trim()).filter(Boolean).slice(0, 12);
  if (!knowledgeItems.length || !objectiveLines.length) return null;
  const pack: OfflineCurriculumPack = { version: 2, subject, objectives: objectiveLines.map(statement => ({ statement })), knowledge: knowledgeItems, promptContext: verifiedContext, cachedAt: new Date().toISOString() };
  const topic = prompt.replace(/^\s*(?:please\s+)?(?:teach|explain|show|walk me through|help me learn|help me understand|help me with|go through|cover|learn)\s+(?:me\s+)?/i, "").trim();
  return buildOfflineLessonFromPack(subject, prompt, topic, pack);
}

export function buildOfflineLessonWithPack(subject: string, prompt: string, topic: string, pack: OfflineCurriculumPack | null): OfflineLesson | null {
  if (!pack) return null;
  return buildOfflineLessonFromPack(subject, prompt, topic, pack);
}

export function offlineScopeForLesson(pack: OfflineCurriculumPack | null, topic: string) {
  return buildOfflineCurriculumScope(pack, topic);
}
