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

/**
 * Project existing mastery evidence onto syllabus topics; this never scores a
 * learner. Defaults are transparent display bands, not validated predictions.
 * Missing/low-volume evidence stays "not enough evidence" rather than zero.
 */
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
    const attempts = finite(evidence?.attempts) ? Math.max(0, Math.floor(evidence.attempts)) : 0;
    const hasScore = finite(evidence?.mastery_score);
    const mastery = hasScore ? clamp(evidence.mastery_score as number) : null;
    const qualified = attempts >= minAttempts && mastery !== null;
    const band: MasteryBand = !qualified
      ? "not_enough_evidence"
      : mastery < developingThreshold
        ? "needs_work"
        : mastery < strongThreshold
          ? "developing"
          : "strong";

    return {
      ...topic,
      mastery: qualified ? mastery : null,
      attempts,
      confidence: finite(evidence?.confidence) ? clamp(evidence.confidence) : null,
      band,
    };
  });

  const buckets = new Map<string, SyllabusHeatmapTopic[]>();
  for (const topic of topics) {
    const groupId = topic.groupId ?? "ungrouped";
    const group = buckets.get(groupId) ?? [];
    group.push(topic);
    buckets.set(groupId, group);
  }

  const groups = Array.from(buckets, ([groupId, groupTopics]) => {
    const scores = groupTopics.flatMap((topic) => topic.mastery === null ? [] : [topic.mastery]);
    return {
      groupId,
      groupTitle: groupTopics[0]?.groupTitle ?? (groupId === "ungrouped" ? "Other topics" : groupId),
      averageMastery: mean(scores),
      evidencedTopics: scores.length,
      totalTopics: groupTopics.length,
      topics: groupTopics,
    };
  });

  const scores = topics.flatMap((topic) => topic.mastery === null ? [] : [topic.mastery]);
  return {
    groups,
    topics,
    summary: {
      evidencedTopics: scores.length,
      totalTopics: topics.length,
      averageMastery: mean(scores),
    },
  };
}
