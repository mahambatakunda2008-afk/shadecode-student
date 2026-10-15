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

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const clamp = (value: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, value));

function mean(values: number[]): number | null {
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
}

/** Project existing mastery evidence onto syllabus topics; this never scores a learner. */
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
    const score = finite(evidence?.mastery_score) ? clamp(evidence.mastery_score) : null;
    const enough = score !== null && attempts >= minAttempts;
    const band: MasteryBand = !enough
      ? "not_enough_evidence"
      : score < developingThreshold
        ? "needs_work"
        : score >= strongThreshold
          ? "strong"
          : "developing";
    return {
      ...item,
      mastery: enough ? score : null,
      attempts,
      confidence: finite(evidence?.confidence) ? clamp(evidence.confidence) : null,
      band,
    };
  });

  const buckets = new Map<string, SyllabusHeatmapTopic[]>();
  for (const topic of topics) {
    const id = topic.groupId ?? "__ungrouped__";
    const bucket = buckets.get(id) ?? [];
    bucket.push(topic);
    buckets.set(id, bucket);
  }

  const groups = [...buckets.entries()].map(([groupId, members]): SyllabusHeatmapGroup => ({
    groupId,
    groupTitle: members[0]?.groupTitle ?? (groupId === "__ungrouped__" ? "Other topics" : groupId),
    averageMastery: mean(members.flatMap((t) => t.mastery === null ? [] : [t.mastery])),
    evidencedTopics: members.filter((t) => t.mastery !== null).length,
    totalTopics: members.length,
    topics: members,
  }));

  const evidenced = topics.flatMap((t) => t.mastery === null ? [] : [t.mastery]);
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
