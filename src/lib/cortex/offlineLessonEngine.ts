export interface OfflineLessonBlock { [key: string]: unknown; type: string; title?: string; content: string; }
export interface OfflineLesson { id: string; title: string; blocks: OfflineLessonBlock[]; }

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
  const result: Array<{ kind: string; title: string; content?: string }> = [];
  for (let i = start + 1; i < all.length; i++) {
    const x = all[i]; if (/^curriculum rule:|^=== END/i.test(x)) break;
    const m = x.match(/^[-*•]\s*([^:|]+):\s*(?:\[[^\]]+\]\s*)?([^|]+?)(?:\s*\|\s*(.*))?$/); if (!m) continue;
    result.push({ kind: clean(m[1]).toLowerCase(), title: clean(m[2]), content: m[3] ? clean(m[3]) : undefined });
  }
  return result;
}

export function buildOfflineLesson(subject: string, prompt: string, verifiedContext: string): OfflineLesson | null {
  const objectiveList = objectives(verifiedContext); const knowledgeList = knowledge(verifiedContext);
  if (!objectiveList.length || !knowledgeList.length) return null;
  const terms = prompt.toLowerCase().split(/[^a-z0-9]+/).filter(x => x.length > 2);
  const matching = knowledgeList.filter(item => terms.some(term => `${item.title} ${item.content || ""}`.toLowerCase().includes(term)));
  const selected = (matching.length ? matching : knowledgeList).slice(0, 14);
  const definitions = selected.filter(x => /definition|term|concept|meaning/i.test(x.kind));
  const formulas = selected.filter(x => /formula|equation|rule|relationship/i.test(x.kind));
  const examples = selected.filter(x => /example|worked|demonstration/i.test(x.kind));
  const assessment = selected.filter(x => /exam|assessment|question|practice|problem/i.test(x.kind));
  const warnings = selected.filter(x => /misconception|mistake|warning|trap/i.test(x.kind));
  const blocks: OfflineLessonBlock[] = [
    block("objective", "Learning target", objectiveList.map(x => `- ${x}`).join("\n")),
    block("prior", "Scope", `Subject: ${subject}\nRequested topic: ${prompt}\n\nThis lesson uses only verified curriculum data cached for this learner.`),
  ];
  if (definitions.length) blocks.push(block("definition", "Key concepts", definitions.map(x => `- ${x.title}${x.content ? `: ${x.content}` : ""}`).join("\n")));
  if (formulas.length) blocks.push(block("formula", "Rules and relationships", formulas.map(x => `- ${x.title}${x.content ? `: ${x.content}` : ""}`).join("\n")));
  if (!definitions.length && !formulas.length) blocks.push(block("concept", "Verified knowledge", selected.slice(0, 5).map(x => `- ${x.title}${x.content ? `: ${x.content}` : ""}`).join("\n")));
  if (examples.length) blocks.push(block("example", "Worked knowledge", examples.slice(0, 3).map((x, i) => `Example ${i + 1}: ${x.title}${x.content ? `\n${x.content}` : ""}`).join("\n\n")));
  const checkpoint = assessment.length ? assessment : selected;
  blocks.push(block("checkpoint", "Checkpoint", checkpoint.slice(0, 3).map(x => `Question: Explain or apply ${x.title}.\nThink: Which verified idea applies, and why?`).join("\n\n")));
  if (warnings.length) blocks.push(block("misconception", "Watch for", warnings.map(x => `- ${x.title}${x.content ? `: ${x.content}` : ""}`).join("\n")));
  if (assessment.length) {
    blocks.push(block("practice", "Practice from the curriculum", assessment.slice(0, 6).map((x, i) => `${i + 1}. ${x.title}${x.content ? `\n${x.content}` : ""}`).join("\n")));
    blocks.push(block("exam", "Assessment transfer", assessment.slice(0, 4).map(x => `Question: ${x.title}${x.content ? `\n${x.content}` : ""}\nApproach: Use the verified knowledge and objectives above.\nExaminer looks for: accurate use of the required knowledge and clear reasoning.`).join("\n\n")));
  }
  blocks.push(block("summary", "Mastery check", "- Explain the requested topic using the verified knowledge.\n- Connect it to the listed syllabus objectives.\n- Complete the available practice."));
  return blocks.length >= 10 ? { id: idFor(subject, prompt), title: `${clean(prompt)}: guided lesson`, blocks } : null;
}
