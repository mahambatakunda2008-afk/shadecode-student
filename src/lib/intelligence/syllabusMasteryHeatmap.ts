/**
 * Project existing Cortex topic mastery onto a syllabus outline.
 * This is a display projection, not a learner-scoring or forecasting model.
 */
export interface SyllabusTopic { topicId: string; title: string; groupId?: string; groupTitle?: string; }
export interface TopicMasteryEvidence { mastery_score?: number | null; attempts?: number | null; confidence?: number | null; }
export type MasteryBand = "not_enough_evidence" | "needs_work" | "developing" | "strong";
export interface SyllabusHeatmapTopic extends SyllabusTopic { mastery: number | null; attempts: number; confidence: number | null; band: MasteryBand; }
export interface SyllabusHeatmapGroup { groupId: string; groupTitle: string; averageMastery: number | null; evidencedTopics: number; totalTopics: number; topics: SyllabusHeatmapTopic[]; }
export interface SyllabusMasteryHeatmap { groups: SyllabusHeatmapGroup[]; topics: SyllabusHeatmapTopic[]; summary: { evidencedTopics: number; totalTopics: number; averageMastery: number | null }; }
export interface HeatmapOptions { minAttempts?: number; developingThreshold?: number; strongThreshold?: number; }
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const clamp = (v: number): number => Math.max(0, Math.min(100, v));
const mean = (xs: number[]): number | null => xs.length ? Math.round(xs.reduce((a,b)=>a+b,0)/xs.length) : null;

export function buildSyllabusMasteryHeatmap(syllabus: SyllabusTopic[], evidenceByTopic: Record<string, TopicMasteryEvidence | undefined>, options: HeatmapOptions = {}): SyllabusMasteryHeatmap {
  const minAttempts = Math.max(1, Math.floor(options.minAttempts ?? 3));
  const developingThreshold = clamp(options.developingThreshold ?? 50);
  const strongThreshold = clamp(options.strongThreshold ?? 80);
  const topics = syllabus.map((item): SyllabusHeatmapTopic => {
    const e = evidenceByTopic[item.topicId];
    const attempts = finite(e?.attempts) ? Math.max(0, Math.floor(e.attempts)) : 0;
    const mastery = attempts >= minAttempts && finite(e?.mastery_score) ? clamp(e.mastery_score) : null;
    const confidence = finite(e?.confidence) ? clamp(e.confidence) : null;
    const band: MasteryBand = mastery === null ? "not_enough_evidence" : mastery < developingThreshold ? "needs_work" : mastery < strongThreshold ? "developing" : "strong";
    return { ...item, mastery, attempts, confidence, band };
  });
  const groupMap = new Map<string, SyllabusHeatmapTopic[]>();
  for (const topic of topics) {
    const id = topic.groupId ?? "__ungrouped__";
    const bucket = groupMap.get(id) ?? [];
    bucket.push(topic);
    groupMap.set(id, bucket);
  }
  const groups = [...groupMap.entries()].map(([groupId, members]): SyllabusHeatmapGroup => {
    const evidenced = members.filter(t => t.mastery !== null);
    return {
      groupId,
      groupTitle: members[0]?.groupTitle ?? (groupId === "__ungrouped__" ? "Ungrouped" : groupId),
      averageMastery: mean(evidenced.map(t => t.mastery as number)),
      evidencedTopics: evidenced.length,
      totalTopics: members.length,
      topics: members,
    };
  });
  const evidenced = topics.filter(t => t.mastery !== null);
  return {
    groups,
    topics,
    summary: {
      evidencedTopics: evidenced.length,
      totalTopics: topics.length,
      averageMastery: mean(evidenced.map(t => t.mastery as number)),
    },
  };
}
