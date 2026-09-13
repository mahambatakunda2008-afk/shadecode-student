export interface OfflineLessonBlock { [key: string]: unknown; type: string; title?: string; content: string; }
export interface OfflineLesson { id: string; title: string; blocks: OfflineLessonBlock[]; }

type Knowledge = { kind: string; title: string; content?: string; code?: string; topicCode?: string; objectiveIds?: string[] };

function clean(value: string) { return value.trim().replace(/\s+/g, " "); }
function idFor(subject: string, prompt: string) {
  const seed = `${subject}:${prompt}`.toLowerCase(); let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  return `offline-lesson-${(hash >>> 0).toString(36)}`;
}
function lines(value: string) { return value.split(/\r?\n/).map(x => x.trim()).filter(Boolean); }
function bullet(value: string) { return value.replace(/^[-*•]\s*/, "").trim(); }
function block(type: string, title: string, content: string): OfflineLessonBlock { return { type, title, content: content.trim() }; }
function unique(values: string[], limit: number) { const seen = new Set<string>(); return values.filter(v => { const k = v.toLowerCase(); if (!v || seen.has(k)) return false; seen.add(k); return true; }).slice(0, limit); }

function objectives(context: string) {
  const all = lines(context); const start = all.findIndex(x => /authoritative syllabus objectives/i.test(x)); if (start < 0) return [];
  const result: string[] = [];
  for (let i = start + 1; i < all.length; i++) { const x = all[i]; if (/^verified syllabus knowledge available|^curriculum rule:|^=== END/i.test(x)) break; if (/^[-*•]\s/.test(x)) result.push(bullet(x)); }
  return unique(result, 12);
}

function knowledge(context: string) {
  const all = lines(context); const start = all.findIndex(x => /verified syllabus knowledge available/i.test(x)); if (start < 0) return [];
  const result: Knowledge[] = [];
  for (let i = start + 1; i < all.length; i++) {
    const x = all[i]; if (/^curriculum rule:|^=== END/i.test(x)) break;
    const m = x.match(/^[-*•]\s*([^:|]+):\s*(?:\[[^\]]+\]\s*)?([^|]+?)(?:\s*\|\s*(.*))?$/); if (!m) continue;
    result.push({ kind: clean(m[1]).toLowerCase(), title: clean(m[2]), content: m[3] ? clean(m[3]) : undefined });
  }
  return result;
}

function topicTerms(prompt: string) { return unique(prompt.toLowerCase().split(/[^a-z0-9]+/).filter(x => x.length > 2), 24); }
function relevant(items: Knowledge[], prompt: string) {
  const terms = topicTerms(prompt);
  const scored = items.map(item => {
    const text = `${item.kind} ${item.title} ${item.content || ""} ${item.topicCode || ""}`.toLowerCase();
    return { item, score: terms.reduce((n, term) => n + (text.includes(term) ? 1 : 0), 0) };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  return scored.map(x => x.item).slice(0, 24);
}
function byKind(items: Knowledge[], pattern: RegExp) { return items.filter(x => pattern.test(x.kind)); }

/** Build only from verified curriculum data. Never synthesize missing subject knowledge or assessment questions. */
export function buildOfflineLesson(subject: string, prompt: string, verifiedContext: string): OfflineLesson | null {
  if (!/VERIFIED SYLLABUS KNOWLEDGE/i.test(verifiedContext)) return null;
  const objectiveList = objectives(verifiedContext);
  const knowledgeList = knowledge(verifiedContext);
  if (!objectiveList.length || !knowledgeList.length) return null;

  const selected = relevant(knowledgeList, prompt);
  if (!selected.length) return null;

  const definitions = byKind(selected, /terminology|definition|concept|content_scope|learning_outcome/i);
  const formulas = byKind(selected, /formula|equation|rule|relationship/i);
  const examples = byKind(selected, /example|worked|demonstration/i);
  const practice = byKind(selected, /assessment|question|practice|problem|examination_format/i);
  const warnings = byKind(selected, /misconception|mistake|warning|constraint|guidance/i);
  const applications = byKind(selected, /practical_activity|project_requirement|application/i);

  const blocks: OfflineLessonBlock[] = [
    block("objective", "Learning target", objectiveList.map(x => `- ${x}`).join("\n")),
    block("prior", "Scope", `Subject: ${subject}\nRequested topic: ${clean(prompt)}\n\nOffline teaching is limited to verified curriculum knowledge available on this device.`),
  ];

  if (definitions.length) blocks.push(block("concept", "Key concepts", definitions.slice(0, 6).map(x => `- ${x.title}${x.content ? `: ${x.content}` : ""}`).join("\n")));
  if (formulas.length) blocks.push(block("formula", "Rules and relationships", formulas.slice(0, 6).map(x => `- ${x.title}${x.content ? `: ${x.content}` : ""}`).join("\n")));
  if (examples.length) blocks.push(block("example", "Verified examples", examples.slice(0, 4).map((x, i) => `Example ${i + 1}: ${x.title}${x.content ? `\n${x.content}` : ""}`).join("\n\n")));
  if (warnings.length) blocks.push(block("misconception", "Watch for", warnings.slice(0, 5).map(x => `- ${x.title}${x.content ? `: ${x.content}` : ""}`).join("\n")));
  if (applications.length) blocks.push(block("application", "Applications", applications.slice(0, 4).map(x => `- ${x.title}${x.content ? `: ${x.content}` : ""}`).join("\n")));

  // Assessment content is emitted only when the verified dataset contains it.
  if (practice.length) {
    blocks.push(block("practice", "Practice", practice.slice(0, 6).map((x, i) => `${i + 1}. ${x.title}${x.content ? `\n${x.content}` : ""}`).join("\n")));
    blocks.push(block("checkpoint", "Checkpoint", practice.slice(0, 3).map((x, i) => `${i + 1}. ${x.title}${x.content ? `\n${x.content}` : ""}`).join("\n\n")));
  }

  // A verified example can support a reflective checkpoint without pretending it is a generated question.
  if (!practice.length && examples.length) {
    blocks.push(block("checkpoint", "Reflection", "Review the verified example above and identify the concept or rule it demonstrates."));
  }

  blocks.push(block("summary", "What to retain", [
    "- Explain the requested topic using the verified knowledge above.",
    "- Connect the explanation to the relevant syllabus objective.",
    practice.length ? "- Complete the verified practice before moving on." : "- Offline assessment content is not cached for this topic yet.",
  ].join("\n")));

  const substantive = blocks.filter(x => !["objective", "prior", "summary"].includes(x.type));
  if (substantive.length < 2) return null;
  return { id: idFor(subject, prompt), title: `${clean(prompt)}: offline lesson`, blocks };
}
