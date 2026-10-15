/**
 * Syllabus heatmap projection from existing Cortex topic mastery evidence.
 * Does not score learners; missing evidence is kept distinct from zero.
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
const average = (xs: number[]): number | null => xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;

/** Build a display model. Thresholds are display bands, not validated psychometric cut-offs. */
export function buildSyllabusMasteryHeatmap(
  syllabus: SyllabusTopic[],
  evidenceByTopic: Record<string, TopicMasteryEvidence | undefined>,
  options: HeatmapOptions = {},
): SyllabusMasteryHeatmap {
  const minAttempts = Math.max(1, Math.floor(options.minAttempts ?? 3));
  const developingThreshold = clamp(options.developingThreshold ?? 50);
  const strongThreshold = clamp(options.strongThreshold ?? 80);

  const topics = syllabus.map((topic): SyllabusHeatmapTopic => {
    const evidence = evidenceByTopic[topic.topicId];
    const attempts = finite(evidence?.attempts) ? Math.max(0, Math.floor(evidence.attempts)) : 0;
    const hasEvidence = attempts >= minAttempts && finite(evidence?.mastery_score);
    const mastery = hasEvidence ? clamp(evidence!.mastery_score!) : null;
    const band: MasteryBand = mastery === null
      ? "not_enough_evidence"
      : mastery < developingThreshold
        ? "needs_work"
        : mastery < strongThreshold
          ? "developing"
          : "strong";
    return {
      ...topic,
      mastery,
      attempts,
      confidence: finite(evidence?.confidence) ? clamp(evidence!.confidence!) : null,
      band,
    };
  });

  const grouped = new Map<string, SyllabusHeatmapTopic[]>();
  for (const topic of topics) {
    const key = topic.groupId ?? "__ungrouped__";
    const current = grouped.get(key) ?? [];
    current.push(topic);
    grouped.set(key, current);
  }

  const groups = [...grouped.entries()].map(([groupId, groupTopics]): SyllabusHeatmapGroup => {
    const scored = groupTopics.flatMap(topic => topic.mastery === null ? [] : [topic.mastery]);
    return {
      groupId,
      groupTitle: groupTopics[0]?.groupTitle ?? (groupId === "__ungrouped__" ? "Ungrouped" : groupId),
      averageMastery: average(scored),
      evidencedTopics: scored.length,
      totalTopics: groupTopics.length,
      topics: groupTopics,
    };
  });

  const scored = topics.flatMap(topic => topic.mastery === null ? [] : [topic.mastery]);
  return {
    groups,
    topics,
    summary: {
      evidencedTopics: scored.length,
      totalTopics: topics.length,
      averageMastery: average(scored),
    },
  };
}
