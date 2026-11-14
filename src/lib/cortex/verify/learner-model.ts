export type VerifyLearningSignal = {
  subject: string;
  topic?: string;
  score?: number;
  correct?: boolean;
  misconceptionTags?: string[];
  occurredAt?: string;
};

export type LearnerTopicModel = {
  key: string;
  subject: string;
  topic: string;
  attempts: number;
  masteryEstimate: number;
  recentScores: number[];
  misconceptionCounts: Record<string, number>;
  lastPracticedAt: string;
};

export type VerifyLearnerModel = {
  version: 1;
  topics: LearnerTopicModel[];
  updatedAt: string;
};

export const EMPTY_VERIFY_LEARNER_MODEL: VerifyLearnerModel = {
  version: 1,
  topics: [],
  updatedAt: new Date(0).toISOString(),
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeLabel(value: string | undefined, fallback: string) {
  return (value || fallback).trim().replace(/\s+/g, " ").slice(0, 100);
}

/** Update the student's private, explainable learner model from a marked attempt. */
export function learnFromVerifyResult(
  model: VerifyLearnerModel,
  signal: VerifyLearningSignal,
): VerifyLearnerModel {
  const subject = normalizeLabel(signal.subject, "General");
  const topic = normalizeLabel(signal.topic, "Unclassified questions");
  const key = `${subject.toLowerCase()}::${topic.toLowerCase()}`;
  const occurredAt = signal.occurredAt && Number.isFinite(Date.parse(signal.occurredAt))
    ? signal.occurredAt : new Date().toISOString();
  const score = typeof signal.score === "number" && Number.isFinite(signal.score)
    ? clampScore(signal.score) : signal.correct === true ? 100 : signal.correct === false ? 0 : null;
  if (score === null) return model;

  const previous = model.topics.find(item => item.key === key);
  const recentScores = [...(previous?.recentScores || []), score].slice(-8);
  const masteryEstimate = previous
    ? Math.round(previous.masteryEstimate * 0.7 + score * 0.3)
    : score;
  const misconceptionCounts = { ...(previous?.misconceptionCounts || {}) };
  for (const rawTag of signal.misconceptionTags || []) {
    const tag = normalizeLabel(rawTag, "").toLowerCase();
    if (tag) misconceptionCounts[tag] = (misconceptionCounts[tag] || 0) + 1;
  }
  const next: LearnerTopicModel = {
    key, subject, topic,
    attempts: (previous?.attempts || 0) + 1,
    masteryEstimate,
    recentScores,
    misconceptionCounts,
    lastPracticedAt: occurredAt,
  };
  const topics = [next, ...model.topics.filter(item => item.key !== key)]
    .sort((a, b) => b.lastPracticedAt.localeCompare(a.lastPracticedAt))
    .slice(0, 40);
  return { version: 1, topics, updatedAt: occurredAt };
}

/** Compact context that changes the next explanation or practice choice. */
export function buildVerifyLearnerContext(model: VerifyLearnerModel): string {
  if (!model.topics.length) return "VERIFY LEARNER MODEL: no marked attempts recorded yet.";
  const lines = model.topics.slice(0, 12).map(item => {
    const recurring = Object.entries(item.misconceptionCounts)
      .sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([tag, count]) => `${tag} (${count}x)`).join(", ");
    return `- ${item.subject} / ${item.topic}: estimated mastery ${item.masteryEstimate}%, ${item.attempts} marked attempt(s), recent scores ${item.recentScores.join("/") || "none"}${recurring ? `; recurring error signals: ${recurring}` : ""}`;
  });
  return [
    "PRIVATE STUDENT LEARNER MODEL (heuristic evidence, not ground truth):",
    ...lines,
    "Adapt the next explanation to recurring errors. Revisit weak areas with a fresh question, not the identical question. Increase difficulty only when recent evidence supports it. Ask the student to retry a misconception before revealing the full solution. Do not claim mastery from one attempt.",
  ].join("\n");
}
