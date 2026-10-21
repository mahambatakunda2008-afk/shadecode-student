/**
 * AI-free "syllabus study guide": a last-resort lesson built only from the learner's verified syllabus
 * (learning outcomes and subsection scope). It never invents teaching content: it turns official outcomes
 * into a know-this list, self-test prompts, an exam-practice note and a checklist, and says plainly that
 * AI lesson generation was unavailable. Returns null when the syllabus gives too little to be useful.
 */

export type GuideKnowledgeItem = {
  kind: string;
  code?: string | null;
  title?: string | null;
  content?: string | null;
  topicCode?: string | null;
};

export type SyllabusGuideBlock = { type: string; title: string; content: string };
export type SyllabusGuide = { title: string; blocks: SyllabusGuideBlock[] };

const MIN_BLOCKS = 10; // the server requires 10 blocks to persist a fallback lesson; never pad to reach it
const MIN_SUBSECTIONS = 2;
const OUTCOMES_PER_BLOCK = 4;
const MAX_SUBSECTIONS = 6;
const MAX_OUTCOMES_PER_SUBSECTION = 8;
const MAX_CHECKLIST_LINES = 24;

type Subsection = { code: string; title: string; outcomes: string[] };

const clean = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();
const stripEnd = (value: string) => value.replace(/[.\s]+$/, "");

/** Chapter = the number before the first dot in a syllabus code ("7.1" -> "7"). */
const chapterOf = (code: string) => code.split(".")[0];

/** Numeric-aware ordering so 7.2 sorts before 7.10. */
const compareCodes = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

/** Turn an official outcome into a short self-test prompt. Keeps the syllabus wording; only adds a verb frame. */
export function selfTestPrompt(outcome: string): string {
  const text = stripEnd(clean(outcome));
  if (!text) return "";
  const recallUse = text.match(/^recall and use (.+)$/i);
  if (recallUse) return `Write down ${recallUse[1]} from memory, then use it in a short worked calculation.`;
  const lead = text.match(/^(understand|describe|define|state|explain|recall|use|calculate|determine|derive|show|sketch|identify|distinguish|compare|interpret|apply|analyse|analyze|evaluate|suggest|outline|recognise|recognize)\b\s*(.*)$/i);
  if (!lead) return `Test yourself: ${text}.`;
  const verb = lead[1].toLowerCase();
  const rest = lead[2];
  // Compound outcomes ("Understand and use the terms ...") don't fit a single verb frame; keep the syllabus wording intact.
  if (/^and\s+/i.test(rest)) return `Test yourself: ${text}.`;
  switch (verb) {
    case "understand": return `Explain in your own words: ${rest.replace(/^that\s+/i, "")}.`;
    case "describe": case "define": case "state": case "explain": case "sketch": case "identify": case "outline": case "suggest":
      return `${lead[1][0].toUpperCase()}${lead[1].slice(1).toLowerCase()} ${rest}.`;
    case "recall": return `Without notes, recall ${rest}.`;
    default: return `Show full working: ${text}.`;
  }
}

function collectSubsections(items: GuideKnowledgeItem[]): Subsection[] {
  const titles = new Map<string, string>();
  const scoped = new Set<string>();
  const outcomes = new Map<string, Array<{ n: number; text: string }>>();
  for (const item of items) {
    const code = clean(item.topicCode);
    if (!code) continue;
    if (item.kind === "content_scope") {
      const title = clean(item.title);
      if (title) { titles.set(code, title); scoped.add(code); }
    } else if (item.kind === "learning_outcome") {
      const text = clean(item.content) || clean(item.title);
      if (!text) continue;
      // Some syllabi (e.g. Biology) have no separate scope rows; the outcome title carries the subsection name
      // ("Progressive waves: outcome 1"), so recover it from there.
      const named = clean(item.title).match(/^(.+?):\s*outcome\s+\d+$/i);
      if (named && !scoped.has(code) && !titles.has(code)) titles.set(code, named[1].trim());
      const n = Number(clean(item.code).split("|")[2]);
      const list = outcomes.get(code) ?? [];
      list.push({ n: Number.isFinite(n) ? n : list.length + 1, text });
      outcomes.set(code, list);
    }
  }
  return [...outcomes.entries()]
    .map(([code, list]) => ({
      code,
      title: titles.get(code) ?? `Subsection ${code}`,
      outcomes: list.sort((a, b) => a.n - b.n).map((o) => o.text).slice(0, MAX_OUTCOMES_PER_SUBSECTION),
    }))
    .filter((s) => s.outcomes.length > 0);
}

export function buildSyllabusGuide(input: {
  subject: string;
  topic: string;
  /** Subsection codes the learner's topic resolved to (e.g. ["7.1"]). */
  matchedTopicCodes: string[];
  /** Syllabus content_scope and learning_outcome items for the learner's verified syllabus. */
  items: GuideKnowledgeItem[];
}): SyllabusGuide | null {
  const all = collectSubsections(input.items);
  const matched = input.matchedTopicCodes.map(clean).filter(Boolean);
  const primary = all.filter((s) => matched.includes(s.code)).sort((a, b) => compareCodes(a.code, b.code));
  if (!primary.length) return null;

  // Widen to the rest of the same syllabus chapter so a narrow topic still gets a useful, honest guide.
  const chapters = new Set(primary.map((s) => chapterOf(s.code)));
  const siblings = all.filter((s) => chapters.has(chapterOf(s.code)) && !matched.includes(s.code)).sort((a, b) => compareCodes(a.code, b.code));
  const chosen = [...primary, ...siblings].slice(0, MAX_SUBSECTIONS);
  if (chosen.length < MIN_SUBSECTIONS) return null;

  const subject = clean(input.subject) || "your subject";
  const topic = clean(input.topic) || chosen[0].title;
  const outcomeTotal = chosen.reduce((sum, s) => sum + s.outcomes.length, 0);

  const blocks: SyllabusGuideBlock[] = [];
  blocks.push({
    type: "objective",
    title: "What this guide is",
    content:
      `AI lesson generation is unavailable right now, so this guide is built directly from your official ${subject} syllabus instead. ` +
      `It lists exactly what the syllabus expects you to know for "${topic}" (${outcomeTotal} learning outcomes across ${chosen.length} subsections), ` +
      `with self-test prompts so you can check yourself. By the end, you should be able to do every outcome below without notes. ` +
      `It has no worked examples: try generating the full lesson again later for those.`,
  });

  for (const section of chosen) {
    // Short blocks read better on a phone, and splitting is how a thin subsection still reaches a real guide.
    // Split evenly (5 outcomes -> 3 + 2, not 4 + 1) so no block is a lonely single line.
    const parts = Math.ceil(section.outcomes.length / OUTCOMES_PER_BLOCK);
    const size = Math.ceil(section.outcomes.length / parts);
    const chunks: string[][] = [];
    for (let i = 0; i < section.outcomes.length; i += size) chunks.push(section.outcomes.slice(i, i + size));
    chunks.forEach((chunk, c) => {
      const offset = c * size;
      blocks.push({
        type: "concept",
        title: `${section.title}: what you must know${chunks.length > 1 ? ` (part ${c + 1} of ${chunks.length})` : ""}`,
        content: `The syllabus says that, for "${section.title}", you should be able to:\n` + chunk.map((o, i) => `${offset + i + 1}. ${stripEnd(o)}.`).join("\n"),
      });
    });
    const prompts = section.outcomes.slice(0, 5).map(selfTestPrompt).filter(Boolean);
    blocks.push({
      type: "checkpoint",
      title: `Check yourself: ${section.title}`,
      content: `Cover your notes and try each of these, then check your answers against your textbook or class notes:\n` + prompts.map((p, i) => `${i + 1}. ${p}`).join("\n"),
    });
  }

  blocks.push({
    type: "exam",
    title: "Turn this into exam marks",
    content:
      `Exam questions test these outcomes using command words such as describe, explain, state, calculate and show that. ` +
      `For each outcome above, practise one exam-style question under time, mark it honestly against a mark scheme, and note which outcomes lose you marks. ` +
      `Those are the ones to revise first.`,
  });

  const checklist = chosen.flatMap((s) => s.outcomes.map((o) => `[ ] ${stripEnd(o)}`)).slice(0, MAX_CHECKLIST_LINES);
  blocks.push({
    type: "summary",
    title: "Your checklist",
    content: `You should now be able to tick every item once you can do it without notes:\n${checklist.join("\n")}`,
  });

  if (blocks.length < MIN_BLOCKS) return null;
  return { title: `Syllabus guide: ${topic}`, blocks };
}
