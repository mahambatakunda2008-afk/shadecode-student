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

export type VerifyPracticeRecommendation = {
  subject: string;
  topic: string;
  masteryEstimate: number;
  daysSincePractice: number;
  priority: number;
  action: "reteach" | "guided-retry" | "transfer-practice" | "spaced-retrieval";
  reason: string;
};

function daysSince(isoDate: string, now: number): number {
  const timestamp = Date.parse(isoDate);
  return Number.isFinite(timestamp) ? Math.max(0, (now - timestamp) / 86_400_000) : 0;
}

/**
 * Rank the next topics to practise using weakness, forgetting risk and recurring
 * error evidence. This is a transparent scheduling heuristic, not a diagnosis.
 */
export function recommendVerifyPractice(
  model: VerifyLearnerModel,
  options: { subject?: string; now?: string; limit?: number } = {},
): VerifyPracticeRecommendation[] {
  const now = options.now && Number.isFinite(Date.parse(options.now)) ? Date.parse(options.now) : Date.now();
  const subject = options.subject?.trim().toLocaleLowerCase("en");
  return model.topics
    .filter(item => !subject || item.subject.toLocaleLowerCase("en") === subject)
    .map(item => {
      const ageDays = daysSince(item.lastPracticedAt, now);
      const mastery = Math.max(0, Math.min(100, item.masteryEstimate));
      const misconceptionTotal = Object.values(item.misconceptionCounts).reduce((sum, count) => sum + Math.max(0, count), 0);
      const recurringSignal = Math.min(1, misconceptionTotal / Math.max(2, item.attempts * 2));
      const reviewInterval = mastery < 50 ? 1 : mastery < 70 ? 3 : mastery < 85 ? 7 : 14;
      const forgettingRisk = Math.min(1, ageDays / reviewInterval);
      const weakness = (100 - mastery) / 100;
      const priority = Math.round((weakness * 0.6 + forgettingRisk * 0.25 + recurringSignal * 0.15) * 100);
      const action: VerifyPracticeRecommendation["action"] = mastery < 45
        ? "reteach"
        : mastery < 65 || recurringSignal >= 0.5
          ? "guided-retry"
          : mastery < 85
            ? "transfer-practice"
            : "spaced-retrieval";
      const recurring = Object.entries(item.misconceptionCounts).sort((a, b) => b[1] - a[1])[0];
      const reason = mastery < 50
        ? "Low recent mastery evidence"
        : recurring && recurring[1] >= 2
          ? `Recurring error: ${recurring[0]}`
          : ageDays >= reviewInterval
            ? "Due for spaced review"
            : "Build retention with a fresh transfer question";
      return {
        subject: item.subject, topic: item.topic, masteryEstimate: mastery,
        daysSincePractice: Math.round(ageDays * 10) / 10, priority, action, reason,
      };
    })
    .sort((a, b) => b.priority - a.priority || b.daysSincePractice - a.daysSincePractice)
    .slice(0, Math.max(1, options.limit ?? 5));
}

/** Compact context that changes the next explanation or practice choice. */
export function buildVerifyLearnerContext(
  model: VerifyLearnerModel,
  options: { subject?: string; now?: string } = {},
): string {
  if (!model.topics.length) return "VERIFY LEARNER MODEL: no marked attempts recorded yet.";
  const relevantTopics = model.topics.filter(item =>
    !options.subject || item.subject.toLocaleLowerCase("en") === options.subject.trim().toLocaleLowerCase("en"),
  );
  const lines = relevantTopics.slice(0, 12).map(item => {
    const recurring = Object.entries(item.misconceptionCounts)
      .sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([tag, count]) => `${tag} (${count}x)`).join(", ");
    return `- ${item.subject} / ${item.topic}: estimated mastery ${item.masteryEstimate}%, ${item.attempts} marked attempt(s), recent scores ${item.recentScores.join("/") || "none"}${recurring ? `; recurring error signals: ${recurring}` : ""}`;
  });
  const recommendations = recommendVerifyPractice(model, options);
  const priorityLines = recommendations.map((item, index) =>
    `${index + 1}. ${item.subject} / ${item.topic}: ${item.action}; priority ${item.priority}/100; ${item.reason}; last practised ${item.daysSincePractice} day(s) ago.`,
  );
  return [
    "PRIVATE STUDENT LEARNER MODEL (heuristic evidence, not ground truth):",
    ...lines,
    "NEXT PRACTICE PRIORITIES (use these to choose the next fresh task when the student asks to practise):",
    ...(priorityLines.length ? priorityLines : ["- No marked evidence for this subject yet. Start with a short diagnostic question."]),
    "Adapt the next explanation to recurring errors. Prefer the highest-priority relevant topic, then generate a new question testing the same skill rather than repeating an identical question. Reteach before increasing difficulty when mastery evidence is weak. Use spaced retrieval for stronger topics. Ask the student to attempt a misconception again before revealing the full solution. Do not claim mastery from one attempt.",
  ].join("\n");
}
