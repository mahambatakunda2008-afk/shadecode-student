export interface SyllabusTopic {
  topicId: string;
  title: string;
  groupId?: string;
  groupTitle?: string;
}
export interface TopicMasteryEvidence {
  mastery_score?: number | null;
  attempts?: number | null;
  confidence?: number | null;
}
export type MasteryBand = "not_enough_evidence" | "needs_work" | "developing" | "strong";
export interface SyllabusHeatmapTopic extends SyllabusTopic {
  mastery: number | null; attempts: number; confidence: number | null; band: MasteryBand;
}
export interface SyllabusHeatmapGroup {
  groupId: string; groupTitle: string; averageMastery: number | null;
  evidencedTopics: number; totalTopics: number; topics: SyllabusHeatmapTopic[];
}
export interface SyllabusMasteryHeatmap {
  groups: SyllabusHeatmapGroup[]; topics: SyllabusHeatmapTopic[];
  summary: { evidencedTopics: number; totalTopics: number; averageMastery: number | null };
}
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
  const developingThreshold = clamp(options.developingThreshold ?? 50);
  const strongThreshold = clamp(options.strongThreshold ?? 80);
  const topics = syllabus.map((item): SyllabusHeatmapTopic => {
    const evidence = evidenceByTopic[item.topicId];
    const attempts = finite(evidence?.attempts) ? Math.max(0, Math.floor(evidence.attempts)) : 0;
    const rawMastery = evidence?.mastery_score;
    const mastery = finite(rawMastery) ? clamp(rawMastery) : null;
    const enough = mastery !== null && attempts >= minAttempts;
    const band: MasteryBand = !enough ? "not_enough_evidence"
      : mastery < developingThreshold ? "needs_work"
      : mastery >= strongThreshold ? "strong" : "developing";
    const confidence = finite(evidence?.confidence) ? clamp(evidence.confidence) : null;
    return { ...item, mastery: enough ? mastery : null, attempts, confidence, band };
  });
  const groupMap = new Map<string, SyllabusHeatmapTopic[]>();
  for (const topic of topics) {
    const id = topic.groupId ?? "__ungrouped__";
    const group = groupMap.get(id) ?? [];
    group.push(topic);
    groupMap.set(id, group);
  }
  const groups = [...groupMap.entries()].map(([groupId, members]): SyllabusHeatmapGroup => {
    const scored = members.flatMap(t => t.mastery === null ? [] : [t.mastery]);
    return {
      groupId,
      groupTitle: members[0]?.groupTitle ?? (groupId === "__ungrouped__" ? "Other topics" : groupId),
      averageMastery: mean(scored),
      evidencedTopics: scored.length,
      totalTopics: members.length,
      topics: members,
    };
  });
  const scored = topics.flatMap(t => t.mastery === null ? [] : [t.mastery]);
  return {
    groups,
    topics,
    summary: { evidencedTopics: scored.length, totalTopics: topics.length, averageMastery: mean(scored) },
  };
}
