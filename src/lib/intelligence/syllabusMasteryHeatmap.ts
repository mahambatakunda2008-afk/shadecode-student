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

/** Build a transparent display model. Thresholds are display bands, not validated psychometric cut-offs. */
export function buildSyllabusMasteryHeatmap(
  syllabus: SyllabusTopic[],
  evidenceByTopic: Record<string, TopicMasteryEvidence | undefined>,
  options: HeatmapOptions = {},
): SyllabusMasteryHeatmap {
  const minAttempts = Math.max(1, Math.floor(options.minAttempts ?? 3));
  const developingThreshold = clamp(options.developingThreshold ?? 50);
  const strongThreshold = clamp(options.strongThreshold ?? 80);
  const topics: SyllabusHeatmapTopic[] = syllabus.map((item) => {
    const evidence = evidenceByTopic[item.topicId];
    const attempts = finite(evidence?.attempts) ? Math.max(0, Math.floor(evidence.attempts)) : 0;
    const hasScore = finite(evidence?.mastery_score);
    const mastery = hasScore ? clamp(evidence.mastery_score as number) : null;
    const enough = attempts >= minAttempts && mastery !== null;
    const band: MasteryBand = !enough ? "not_enough_evidence"
      : mastery < developingThreshold ? "needs_work"
      : mastery >= strongThreshold ? "strong" : "developing";
    return {
      ...item, attempts, mastery,
      confidence: finite(evidence?.confidence) ? clamp(evidence.confidence) : null,
      band,
    };
  });

  const byGroup = new Map<string, SyllabusHeatmapTopic[]>();
  for (const topic of topics) {
    const id = topic.groupId ?? "ungrouped";
    const list = byGroup.get(id) ?? [];
    list.push(topic);
    byGroup.set(id, list);
  }
  const groups: SyllabusHeatmapGroup[] = Array.from(byGroup, ([groupId, members]) => {
    const measured = members.filter((t) => t.band !== "not_enough_evidence" && t.mastery !== null);
    return {
      groupId,
      groupTitle: members.find((t) => t.groupTitle)?.groupTitle ?? (groupId === "ungrouped" ? "Other topics" : groupId),
      averageMastery: average(measured.map((t) => t.mastery as number)),
      evidencedTopics: measured.length,
      totalTopics: members.length,
      topics: members,
    };
  });
  const measured = topics.filter((t) => t.band !== "not_enough_evidence" && t.mastery !== null);
  return {
    groups, topics,
    summary: {
      evidencedTopics: measured.length,
      totalTopics: topics.length,
      averageMastery: average(measured.map((t) => t.mastery as number)),
    },
  };
}
