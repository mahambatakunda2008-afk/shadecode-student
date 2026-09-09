export type NextActionKind =
  | "repair-prerequisite"
  | "targeted-practice"
  | "retrieval-check"
  | "consolidate"
  | "continue";

export interface TopicEvidence {
  topic: string;
  subject: string;
  mastery: number;
  retention: number;
  confidence: number;
  errorRate: number;
  prerequisiteHealth: number;
  recentImprovement: number;
  uncertainty: number;
  attempts: number;
  lastAttempted?: string;
}

export interface NextActionDecision {
  kind: NextActionKind;
  subject: string;
  topic: string;
  priority: number;
  title: string;
  reason: string;
  evidence: Array<{ signal: string; value: number | string; interpretation: string }>;
  intervention: string;
  successCheck: string;
}

function n(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function score(row: TopicEvidence): number {
  const masteryGap = Math.max(0, 70 - row.mastery) * 1.2;
  const retentionGap = Math.max(0, 65 - row.retention) * 0.8;
  const errors = row.errorRate * 0.7;
  const prerequisite = Math.max(0, 60 - row.prerequisiteHealth) * 1.1;
  const uncertainty = row.uncertainty * 0.25;
  const recencyBoost = row.lastAttempted ? 5 : 0;
  return masteryGap + retentionGap + errors + prerequisite + uncertainty + recencyBoost;
}

function decisionFor(row: TopicEvidence): NextActionDecision {
  const priority = Number(score(row).toFixed(2));
  const evidence: NextActionDecision["evidence"] = [
    { signal: "mastery", value: row.mastery, interpretation: row.mastery < 50 ? "weak" : row.mastery < 70 ? "developing" : "secure" },
    { signal: "error rate", value: row.errorRate, interpretation: row.errorRate >= 35 ? "frequent errors" : "manageable" },
    { signal: "retention", value: row.retention, interpretation: row.retention < 65 ? "needs retrieval" : "holding" },
    { signal: "attempts", value: row.attempts, interpretation: row.attempts > 0 ? "observations recorded" : "no observations yet" },
  ];

  if (row.prerequisiteHealth < 45) {
    return { kind: "repair-prerequisite", subject: row.subject, topic: row.topic, priority, title: `Repair the prerequisite behind ${row.topic}`, reason: `Cortex found ${row.topic} is being attempted with weak prerequisite health (${row.prerequisiteHealth}/100). Fixing the dependency should be more valuable than repeating the same surface questions.`, evidence: [...evidence, { signal: "prerequisite health", value: row.prerequisiteHealth, interpretation: "blocked" }], intervention: `Review the prerequisite concept, then complete 3 graduated ${row.topic} questions.`, successCheck: `Pass a short retrieval check on ${row.topic} at 70% or higher.` };
  }
  if (row.mastery < 55 || row.errorRate >= 35) {
    return { kind: "targeted-practice", subject: row.subject, topic: row.topic, priority, title: `Target ${row.topic}`, reason: `The evidence shows low mastery (${row.mastery}/100) and/or a high error rate (${row.errorRate}/100). Cortex is choosing focused practice instead of a generic lesson.`, evidence, intervention: `Do a focused 5-question practice set on ${row.topic}, weighted toward the error pattern.`, successCheck: `Compare the next attempt with the current ${row.mastery}/100 mastery state and require at least 70% evidence.` };
  }
  if (row.retention < 65 || row.uncertainty >= 55) {
    return { kind: "retrieval-check", subject: row.subject, topic: row.topic, priority, title: `Retrieve ${row.topic} before it fades`, reason: `Mastery is reasonable, but retention (${row.retention}/100) or uncertainty (${row.uncertainty}/100) suggests the knowledge is not yet stable.`, evidence, intervention: `Run a short closed-book retrieval check on ${row.topic} before introducing new material.`, successCheck: `Record the retrieval result as a learning observation and update mastery from the observed evidence.` };
  }
  if (row.mastery >= 80 && row.retention >= 75) {
    return { kind: "consolidate", subject: row.subject, topic: row.topic, priority, title: `Consolidate ${row.topic} and move on`, reason: `${row.topic} is showing strong mastery (${row.mastery}/100) and retention (${row.retention}/100). More repetition has diminishing value.`, evidence, intervention: `Complete one mixed transfer problem, then move to the next highest-value topic.`, successCheck: `Keep the transfer attempt above 70% and leave ${row.topic} in spaced review.` };
  }
  return { kind: "continue", subject: row.subject, topic: row.topic, priority, title: `Continue building ${row.topic}`, reason: `The current evidence is developing but does not justify a stronger intervention yet. Cortex will gather another observation.`, evidence, intervention: `Complete a short mixed practice set on ${row.topic}.`, successCheck: `Use the result as the next learning observation and recompute the decision.` };
}

export function chooseNextAction(rows: TopicEvidence[]): NextActionDecision | null {
  return rows.filter(row => row.topic.trim() && row.subject.trim()).map(decisionFor).sort((a, b) => b.priority - a.priority)[0] ?? null;
}

export function mapTopicMasteryRow(row: Record<string, unknown>): TopicEvidence {
  return { topic: String(row.topic ?? ""), subject: String(row.subject ?? ""), mastery: n(row.mastery_score), retention: n(row.retention), confidence: n(row.confidence), errorRate: n(row.error_rate), prerequisiteHealth: n(row.prerequisite_health), recentImprovement: n(row.recent_improvement), uncertainty: n(row.uncertainty), attempts: Math.max(0, Math.floor(n(row.attempts))), lastAttempted: typeof row.last_attempted === "string" ? row.last_attempted : undefined };
}
