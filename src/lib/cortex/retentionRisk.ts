/**
 * src/lib/cortex/retentionRisk.ts
 *
 * Implements "Retention Risk" -- Priority Engine Factor 4 in
 * blueprints/MISSION CONTROL/Chapter 7.docx ("predicts forgetting before
 * it happens"). Previously 0% represented anywhere in the recommendation
 * pipeline (src/lib/recommendation-engine/engine.ts had no forgetting/
 * staleness signal at all), despite topic_mastery.last_attempted being
 * exactly the data this factor needs.
 *
 * This is a deliberately simple, honestly-labeled heuristic -- NOT a
 * validated spaced-repetition/forgetting-curve model. The blueprint's own
 * illustrative example ("Current Retention 74%, Predicted Tomorrow 69%")
 * implies a precision this repo has no research or data to back; claiming
 * that precision would repeat the exact fabricated-data mistake already
 * caught once in this codebase (see NextActionDashboard.tsx's own comment
 * on the removed Exam Readiness card). What this DOES give: a real,
 * defensible ranking signal -- topics decay faster the longer they go
 * unreviewed, more so if mastery is weak or already trending down.
 */

export interface TopicMasteryInput {
  subject: string;
  topic: string;
  mastery_score: number; // 0-100
  last_attempted: string; // ISO timestamp
  trend: number; // positive = improving, negative = declining
}

export interface RetentionRiskResult {
  subject: string;
  topic: string;
  daysSinceReview: number;
  riskScore: number; // 0-100, higher = more at risk of being forgotten
  isAtRisk: boolean;
  reason: string;
}

const AT_RISK_THRESHOLD = 60;
const DECAY_SENSITIVITY = 3; // tunable: higher = risk climbs faster per day
const MIN_DECAY_RATE = 0.5; // even a fully-mastered topic still decays some
const MAX_TREND_PENALTY = 20;

export function calculateRetentionRisk(
  input: TopicMasteryInput,
  now: Date = new Date()
): RetentionRiskResult {
  const lastAttempted = new Date(input.last_attempted);
  const daysSinceReview = Math.max(
    0,
    Math.floor((now.getTime() - lastAttempted.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Weaker topics decay faster; stronger topics decay slower but never
  // stop entirely (floor of MIN_DECAY_RATE) -- nothing stays retained
  // forever with zero review.
  const decayRate = Math.max(MIN_DECAY_RATE, 1 - input.mastery_score / 100);
  const baseRisk = Math.min(100, daysSinceReview * decayRate * DECAY_SENSITIVITY);

  // A topic already trending downward is more fragile than a flat one
  // at the same staleness -- add a bounded penalty rather than letting
  // one bad recent attempt dominate the whole score.
  const trendPenalty = input.trend < 0 ? Math.min(MAX_TREND_PENALTY, Math.abs(input.trend)) : 0;

  const riskScore = Math.round(Math.min(100, baseRisk + trendPenalty));
  const isAtRisk = riskScore >= AT_RISK_THRESHOLD;

  const reason = buildReason(input, daysSinceReview, riskScore, isAtRisk);

  return { subject: input.subject, topic: input.topic, daysSinceReview, riskScore, isAtRisk, reason };
}

function buildReason(
  input: TopicMasteryInput,
  daysSinceReview: number,
  riskScore: number,
  isAtRisk: boolean
): string {
  if (daysSinceReview === 0) {
    return `Reviewed today -- retention is fresh.`;
  }
  const dayWord = daysSinceReview === 1 ? "day" : "days";
  if (!isAtRisk) {
    return `Last reviewed ${daysSinceReview} ${dayWord} ago at ${input.mastery_score}% mastery -- still holding.`;
  }
  const trendNote = input.trend < 0 ? ", and it was already trending down" : "";
  return `Not reviewed in ${daysSinceReview} ${dayWord}${trendNote} -- risk of forgetting is climbing (${riskScore}/100).`;
}

/**
 * Ranks a set of topics by retention risk, highest first -- the ordering
 * the Priority Engine actually needs, not just per-topic scores in
 * isolation.
 */
export function rankByRetentionRisk(
  topics: TopicMasteryInput[],
  now: Date = new Date()
): RetentionRiskResult[] {
  return topics
    .map((t) => calculateRetentionRisk(t, now))
    .sort((a, b) => b.riskScore - a.riskScore);
}
