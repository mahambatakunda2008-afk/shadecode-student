import type { LearningEvidence } from "./evidence";

export type TopicMastery = {
  key: string;
  subject?: string;
  topic: string;
  attempts: number;
  averagePercentage?: number;
  trend: "improving" | "declining" | "stable" | "unknown";
  mastery: "unknown" | "developing" | "secure";
  weak: boolean;
  strong: boolean;
};

export type LearnerProfile = {
  evidenceCount: number;
  subjects: string[];
  weakAreas: string[];
  strongAreas: string[];
  recentAverage?: number;
  topicMastery: TopicMastery[];
  generatedAt: string;
};

const keyFor = (subject: string | undefined, topic: string): string =>
  `${(subject ?? "").trim().toLowerCase()}::${topic.trim().toLowerCase()}`;

const average = (values: number[]): number | undefined =>
  values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : undefined;

export function buildLearnerProfile(evidence: LearningEvidence[], now = new Date().toISOString()): LearnerProfile {
  const ordered = [...evidence].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const subjects = [...new Set(ordered.map((item) => item.subject).filter((value): value is string => Boolean(value)))].sort();
  const groups = new Map<string, LearningEvidence[]>();

  for (const item of ordered) {
    if (!item.topic?.trim()) continue;
    const key = keyFor(item.subject, item.topic);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  const topicMastery: TopicMastery[] = [...groups.entries()].map(([key, items]): TopicMastery => {
    const percentages = items.map((item) => item.percentage).filter((value): value is number => typeof value === "number");
    const recent = percentages.slice(-3);
    const older = percentages.slice(0, -3);
    const recentAverage = average(recent);
    const olderAverage = average(older);
    const delta = recentAverage !== undefined && olderAverage !== undefined ? recentAverage - olderAverage : undefined;
    const last = percentages.at(-1);
    const weak = last !== undefined ? last < 50 : items.some((item) => item.outcome === "struggled");
    const strong = last !== undefined ? last >= 85 : items.some((item) => item.outcome === "mastered");
    const topic = items.at(-1)?.topic?.trim() ?? "";
    const averagePercentage = average(percentages);
    const mastery: TopicMastery["mastery"] = strong ? "secure" : weak ? "developing" : averagePercentage === undefined ? "unknown" : "developing";
    const trend: TopicMastery["trend"] = delta === undefined ? "unknown" : delta >= 5 ? "improving" : delta <= -5 ? "declining" : "stable";

    return {
      key,
      subject: items.at(-1)?.subject?.trim() || undefined,
      topic,
      attempts: items.length,
      averagePercentage,
      trend,
      mastery,
      weak,
      strong,
    };
  }).sort((a, b) => (a.averagePercentage ?? 101) - (b.averagePercentage ?? 101));

  const percentages = ordered.map((item) => item.percentage).filter((value): value is number => typeof value === "number");
  const weakAreas = [...new Set(topicMastery.filter((item) => item.weak).map((item) => item.topic))].slice(0, 20);
  const strongAreas = [...new Set(topicMastery.filter((item) => item.strong).map((item) => item.topic))].slice(0, 20);

  return {
    evidenceCount: ordered.length,
    subjects,
    weakAreas,
    strongAreas,
    recentAverage: average(percentages.slice(-5)),
    topicMastery,
    generatedAt: now,
  };
}
