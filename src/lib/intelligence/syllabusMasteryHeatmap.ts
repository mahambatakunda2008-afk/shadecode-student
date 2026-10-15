/**
 * Pure syllabus-to-mastery view model for Cortex's syllabus heatmap.
 *
 * This module deliberately does not calculate mastery. It projects the existing
 * topic_mastery evidence onto a curriculum outline, preserving "not enough
 * evidence" as a distinct state instead of displaying an invented zero.
 *
 * Thresholds are product display bands, not validated psychometric cut-offs.
 */

export interface SyllabusTopic {
  /** Stable curriculum/topic ID, matching the topic_mastery topic key. */
  topicId: string;
  title: string;
  /** Optional grouping ID (e.g. subject, unit, or syllabus section). */
  groupId?: string;
  groupTitle?: string;
}

export interface TopicMasteryEvidence {
  mastery_score?: number | null;
  attempts?: number | null;
  confidence?: number | null;
  uncertainty?: number | null;
  last_observed_at?: string | null;
}

export type MasteryBand =
  | "not_enough_evidence"
  | "needs_work"
  | "developing"
  | "strong";

export interface SyllabusHeatmapTopic extends SyllabusTopic {
  mastery: number | null;
  attempts: number;
  confidence: number | null;
  band: MasteryBand;
}

export interface SyllabusHeatmapGroup {
  groupId: string;
  groupTitle: string;
  /** Average over evidence-bearing topics only; never treats missing as zero. */
  averageMastery: number | null;
  evidencedTopics: number;
  totalTopics: number;
  topics: SyllabusHeatmapTopic[];
}

export interface SyllabusMasteryHeatmap {
  groups: SyllabusHeatmapGroup[];
  topics: SyllabusHeatmapTopic[];
  summary: {
    evidencedTopics: number;
    totalTopics: number;
    averageMastery: number | null;
  };
}

export interface HeatmapOptions {
  /** Require this many attempts before assigning a mastery colour. Default 3. */
  minAttempts?: number;
  /** Values below this band are "needs_work". Default 50. */
  developingThreshold?: number;
  /** Values at/above this band are "strong". Default 80. */
  strongThreshold?: number;
}

function finiteScore(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
}

function finiteCount(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function masteryBand(
  mastery: number | null,
  attempts: number,
  minAttempts = 3,
  developingThreshold = 50,
  strongThreshold = 80,
): MasteryBand {
  if (mastery == null || attempts < minAttempts) return "not_enough_evidence";
  if (mastery < developingThreshold) return "needs_work";
  if (mastery < strongThreshold) return "developing";
  return "strong";
}

export function buildSyllabusMasteryHeatmap(
  syllabus: SyllabusTopic[],
  evidenceByTopicId: Record<string, TopicMasteryEvidence | undefined>,
  options: HeatmapOptions = {},
): SyllabusMasteryHeatmap {
  const minAttempts = Math.max(1, Math.floor(options.minAttempts ?? 3));
  const developingThreshold = options.developingThreshold ?? 50;
  const strongThreshold = options.strongThreshold ?? 80;

  const topics: SyllabusHeatmapTopic[] = syllabus.map((topic) => {
    const evidence = evidenceByTopicId[topic.topicId];
    const attempts = finiteCount(evidence?.attempts);
    const score = finiteScore(evidence?.mastery_score);
    const mastery = attempts >= minAttempts ? score : null;

    return {
      ...topic,
      mastery,
      attempts,
      confidence: finiteScore(evidence?.confidence),
      band: masteryBand(
        mastery,
        attempts,
        minAttempts,
        developingThreshold,
        strongThreshold,
      ),
    };
  });

  const groupsById = new Map<string, SyllabusHeatmapTopic[]>();
  for (const topic of topics) {
    const groupId = topic.groupId ?? "__ungrouped__";
    const group = groupsById.get(groupId) ?? [];
    group.push(topic);
    groupsById.set(groupId, group);
  }

  const groups: SyllabusHeatmapGroup[] = Array.from(groupsById, ([groupId, groupTopics]) => {
    const evidenced = groupTopics.flatMap((topic) =>
      topic.mastery == null ? [] : [topic.mastery],
    );
    return {
      groupId,
      groupTitle: groupTopics[0]?.groupTitle ?? (groupId === "__ungrouped__" ? "Other topics" : groupId),
      averageMastery: average(evidenced),
      evidencedTopics: evidenced.length,
      totalTopics: groupTopics.length,
      topics: groupTopics,
    };
  });

  const evidenced = topics.flatMap((topic) =>
    topic.mastery == null ? [] : [topic.mastery],
  );

  return {
    groups,
    topics,
    summary: {
      evidencedTopics: evidenced.length,
      totalTopics: topics.length,
      averageMastery: average(evidenced),
    },
  };
}
