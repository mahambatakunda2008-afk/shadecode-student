export interface SyllabusTopic { topicId: string; title: string; groupId?: string; groupTitle?: string; }
export interface TopicMasteryEvidence { mastery_score?: number | null; attempts?: number | null; confidence?: number | null; }
export type MasteryBand = "not_enough_evidence" | "needs_work" | "developing" | "strong";
export interface SyllabusHeatmapTopic extends SyllabusTopic { mastery: number | null; attempts: number; confidence: number | null; band: MasteryBand; }
export interface SyllabusHeatmapGroup { groupId: string; groupTitle: string; averageMastery: number | null; evidencedTopics: number; totalTopics: number; topics: SyllabusHeatmapTopic[]; }
export interface SyllabusMasteryHeatmap { groups: SyllabusHeatmapGroup[]; topics: SyllabusHeatmapTopic[]; summary: { evidencedTopics: number; totalTopics: number; averageMastery: number | null }; }
export interface HeatmapOptions { minAttempts?: number; developingThreshold?: number; strongThreshold?: number; }
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const clamp = (v: number): number => Math.max(0, Math.min(100, v));
const avg = (xs: number[]): number | null => xs.length ? Math.round(xs.reduce((a,b)=>a+b,0)/xs.length) : null;
export function buildSyllabusMasteryHeatmap(syllabus: SyllabusTopic[], evidence: Record<string, TopicMasteryEvidence | undefined>, options: HeatmapOptions = {}): SyllabusMasteryHeatmap {
 const minAttempts = Math.max(1, Math.floor(options.minAttempts ?? 3));
 const developing = clamp(options.developingThreshold ?? 50);
 const strong = clamp(options.strongThreshold ?? 80);
 const topics = syllabus.map((s): SyllabusHeatmapTopic => {
  const e = evidence[s.topicId];
  const attempts = finite(e?.attempts) ? Math.max(0, Math.floor(e.attempts)) : 0;
  const mastery = attempts >= minAttempts && finite(e?.mastery_score) ? clamp(e.mastery_score) : null;
  const band: MasteryBand = mastery === null ? "not_enough_evidence" : mastery < developing ? "needs_work" : mastery < strong ? "developing" : "strong";
  return {...s, mastery, attempts, confidence: finite(e?.confidence) ? clamp(e.confidence) : null, band};
 });
 const map = new Map<string, SyllabusHeatmapTopic[]>();
 for (const t of topics) { const id=t.groupId ?? "__ungrouped__"; map.set(id,[...(map.get(id) ?? []),t]); }
 const groups = [...map.entries()].map(([groupId, items]) => {
  const values=items.flatMap(t=>t.mastery === null ? [] : [t.mastery]);
  return {groupId,groupTitle:items[0].groupTitle ?? (groupId === "__ungrouped__" ? "Ungrouped" : groupId),averageMastery:avg(values),evidencedTopics:values.length,totalTopics:items.length,topics:items};
 });
 const values=topics.flatMap(t=>t.mastery === null ? [] : [t.mastery]);
 return {groups,topics,summary:{evidencedTopics:values.length,totalTopics:topics.length,averageMastery:avg(values)}};
}