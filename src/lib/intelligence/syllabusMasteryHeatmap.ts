/**
 * Project existing Cortex topic mastery onto a syllabus outline.
 * This is a display projection, not a learner-scoring or forecasting model.
 */
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
  mastery: number | null;
  attempts: number;
  confidence: number | null;
  band: MasteryBand;
}
export interface SyllabusHeatmapGroup {
  groupId: string;
  groupTitle: string;
  averageMastery: number | null;
  evidencedTopics: number;
  totalTopics: number;
  topics: SyllabusHeatmapTopic[];
}
export interface SyllabusMasteryHeatmap {
  groups: SyllabusHeatmapGroup[];
  topics: SyllabusHeatmapTopic[];
  summary: { evidencedTopics: number; totalTopics: number; averageMastery: number | null };
}
export interface HeatmapOptions {
  minAttempts?: number;
  developingThreshold?: number;
  strongThreshold?: number;
}
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const clamp = (value: number): number => Math.max(0, Math.min(100, value));
const mean = (values: number[]): number | null =>
  values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;

export function buildSyllabusMasteryHeatmap(
  syllabus: SyllabusTopic[],
  evidenceByTopic: Record<string, TopicMasteryEvidence | undefined>,
  options: HeatmapOptions = {},
): SyllabusMasteryHeatmap {
  const minAttempts = Math.max(1, Math.floor(options.minAttempts ?? 3));
  const developingThreshold = clamp(options.developingThreshold ?? 50);
  const strongThreshold = clamp(options.strongThreshold ?? 80);

  const topics: SyllabusHeatmapTopic[] = syllabus.map((topic) => {
    const evidence = evidenceByTopic[topic.topicId];
    const attempts = isFiniteNumber(evidence?.attempts)
      ? Math.max(0, Math.floor(evidence.attempts))
      : 0;
    const hasMastery = attempts >= minAttempts && isFiniteNumber(evidence?.mastery_score);
    const mastery = hasMastery ? clamp(evidence!.mastery_score!) : null;
    const confidence = isFiniteNumber(evidence?.confidence) ? clamp(evidence.confidence) : null;
    const band: MasteryBand = mastery === null
      ? "not_enough_evidence"
      : mastery < developingThreshold
        ? "needs_work"
        : mastery < strongThreshold
          ? "developing"
          : "strong";
    return { ...topic, mastery, attempts, confidence, band };
  });

  const grouped = new Map<string, SyllabusHeatmapTopic[]>();
  for (const topic of topics) {
    const groupId = topic.groupId ?? "__ungrouped__";
    const members = grouped.get(groupId) ?? [];
    members.push(topic);
    grouped.set(groupId, members);
  }

  const groups: SyllabusHeatmapGroup[] = Array.from(grouped, ([groupId, members]) => {
    const evidenced = members.flatMap((topic) => topic.mastery === null ? [] : [topic.mastery]);
    return {
      groupId,
      groupTitle: members[0]?.groupTitle ?? (groupId === "__ungrouped__" ? "Ungrouped" : groupId),
      averageMastery: mean(evidenced),
      evidencedTopics: evidenced.length,
      totalTopics: members.length,
      topics: members,
    };
  });

  const evidenced = topics.flatMap((topic) => topic.mastery === null ? [] : [topic.mastery]);
  return {
    groups,
    topics,
    summary: {
      evidencedTopics: evidenced.length,
      totalTopics: topics.length,
      averageMastery: mean(evidenced),
    },
  };
}
