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

/** Projects existing mastery evidence; it does not score or predict a learner. */
export function buildSyllabusMasteryHeatmap(
  syllabus: SyllabusTopic[],
  evidenceByTopic: Record<string, TopicMasteryEvidence | undefined>,
  options: HeatmapOptions = {},
): SyllabusMasteryHeatmap {
  const minAttempts = Math.max(1, Math.floor(options.minAttempts ?? 3));
  const developing = clamp(options.developingThreshold ?? 50);
  const strong = clamp(options.strongThreshold ?? 80);
  const topics: SyllabusHeatmapTopic[] = syllabus.map((topic) => {
    const evidence = evidenceByTopic[topic.topicId];
    const attempts = finite(evidence?.attempts) ? Math.max(0, Math.floor(evidence.attempts)) : 0;
    const raw = evidence?.mastery_score;
    const enough = attempts >= minAttempts && finite(raw);
    const mastery = enough ? clamp(raw) : null;
    const band: MasteryBand = mastery === null ? "not_enough_evidence"
      : mastery < developing ? "needs_work"
      : mastery < strong ? "developing" : "strong";
    return {
      ...topic, attempts, mastery,
      confidence: finite(evidence?.confidence) ? clamp(evidence.confidence) : null,
      band,
    };
  });

  const buckets = new Map<string, SyllabusHeatmapTopic[]>();
  for (const topic of topics) {
    const groupId = topic.groupId ?? "__ungrouped__";
    const bucket = buckets.get(groupId) ?? [];
    bucket.push(topic);
    buckets.set(groupId, bucket);
  }
  const groups = Array.from(buckets, ([groupId, groupTopics]) => {
    const groupTitle = groupTopics.find((t) => t.groupTitle)?.groupTitle
      ?? (groupId === "__ungrouped__" ? "Other topics" : groupId);
    const evidenced = groupTopics.flatMap((t) => t.mastery === null ? [] : [t.mastery]);
    return {
      groupId, groupTitle, topics: groupTopics,
      averageMastery: mean(evidenced),
      evidencedTopics: evidenced.length, totalTopics: groupTopics.length,
    };
  });
  const evidenced = topics.flatMap((t) => t.mastery === null ? [] : [t.mastery]);
  return {
    groups, topics,
    summary: { evidencedTopics: evidenced.length, totalTopics: topics.length, averageMastery: mean(evidenced) },
  };
}
