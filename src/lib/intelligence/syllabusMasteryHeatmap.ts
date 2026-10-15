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

export function buildSyllabusMasteryHeatmap(
  syllabus: SyllabusTopic[],
  evidenceByTopic: Record<string, TopicMasteryEvidence | undefined>,
  options: HeatmapOptions = {},
): SyllabusMasteryHeatmap {
  const minAttempts = Math.max(1, Math.floor(options.minAttempts ?? 3));
  const developingThreshold = clamp(options.developingThreshold ?? 50);
  const strongThreshold = clamp(options.strongThreshold ?? 80);

  const topics = syllabus.map((item): SyllabusHeatmapTopic => {
    const evidence = evidenceByTopic[item.topicId];
    const attempts = finite(evidence?.attempts) ? Math.max(0, Math.floor(evidence.attempts)) : 0;
    const hasScore = finite(evidence?.mastery_score);
    const mastery = attempts >= minAttempts && hasScore ? clamp(evidence!.mastery_score!) : null;
    const band: MasteryBand = mastery === null
      ? "not_enough_evidence"
      : mastery < developingThreshold
        ? "needs_work"
        : mastery < strongThreshold
          ? "developing"
          : "strong";
    return {
      ...item,
      mastery,
      attempts,
      confidence: finite(evidence?.confidence) ? clamp(evidence.confidence) : null,
      band,
    };
  });

  const grouped = new Map<string, SyllabusHeatmapTopic[]>();
  for (const topic of topics) {
    const id = topic.groupId ?? "__ungrouped__";
    const current = grouped.get(id) ?? [];
    current.push(topic);
    grouped.set(id, current);
  }

  const groups = Array.from(grouped, ([groupId, groupTopics]): SyllabusHeatmapGroup => {
    const evidenced = groupTopics.filter(topic => topic.mastery !== null);
    return {
      groupId,
      groupTitle: groupTopics[0]?.groupTitle ?? (groupId === "__ungrouped__" ? "Other topics" : groupId),
      averageMastery: mean(evidenced.map(topic => topic.mastery!)),
      evidencedTopics: evidenced.length,
      totalTopics: groupTopics.length,
      topics: groupTopics,
    };
  });

  const evidenced = topics.filter(topic => topic.mastery !== null);
  return {
    groups,
    topics,
    summary: {
      evidencedTopics: evidenced.length,
      totalTopics: topics.length,
      averageMastery: mean(evidenced.map(topic => topic.mastery!)),
    },
  };
}
