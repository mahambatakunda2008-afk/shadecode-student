import type { VerifyInterventionOutcome } from "./intervention-outcomes";

export type VerifyInterventionSelection = {
  recommendedLevel: "hint" | "method" | "solution";
  curriculumTopicKey: string;
  interventionCounts: Record<"hint" | "method" | "solution", number>;
  meanScoreChange: Record<"hint" | "method" | "solution", number>;
  advantage: number;
  confidence: "exploratory";
  interpretation: "descriptive_not_causal";
};

const LEVELS = ["hint", "method", "solution"] as const;

function normalizeSubjectKey(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en");
}

/**
 * Select a teaching approach only when repeated, completed interventions
 * provide a clear within-student, same-topic signal. This is an exploratory
 * association, not a causal estimate or a universal ranking of help levels.
 */
export function selectVerifyIntervention(
  outcomes: VerifyInterventionOutcome[],
  options: { subjectKey: string; topicId: string; curriculumTopicKey?: string },
): VerifyInterventionSelection | null {
  const eligibleById = new Map(outcomes.filter(item =>
    normalizeSubjectKey(item.subjectKey) === normalizeSubjectKey(options.subjectKey) &&
    item.topicId === options.topicId &&
    (!options.curriculumTopicKey || item.curriculumTopicKey === options.curriculumTopicKey) &&
    item.state !== "collecting_evidence" &&
    item.scoreChange !== null &&
    item.baselineAttempts >= 2 &&
    item.transferAttempts >= 2 &&
    item.interpretation === "descriptive_not_causal" &&
    Number.isFinite(item.scoreChange),
  ).map(item => [item.interventionId, item] as const));
  const eligible = [...eligibleById.values()];
  const curriculumKeys = [...new Set(eligible.map(item => item.curriculumTopicKey))];
  // Never combine evidence from multiple syllabus topic identities.
  if (curriculumKeys.length !== 1) return null;

  const counts = { hint: 0, method: 0, solution: 0 };
  const totals = { hint: 0, method: 0, solution: 0 };
  for (const item of eligible) {
    counts[item.interventionLevel] += 1;
    totals[item.interventionLevel] += item.scoreChange!;
  }
  // Two independent completed intervention cycles per compared approach.
  const compared = LEVELS.filter(level => counts[level] >= 2);
  if (compared.length < 2) return null;

  const means = {
    hint: counts.hint ? totals.hint / counts.hint : 0,
    method: counts.method ? totals.method / counts.method : 0,
    solution: counts.solution ? totals.solution / counts.solution : 0,
  };
  const ranked = [...compared].sort((a, b) => means[b] - means[a] || LEVELS.indexOf(a) - LEVELS.indexOf(b));
  const best = ranked[0];
  const second = ranked[1];
  const advantage = Math.round((means[best] - means[second]) * 10) / 10;
  // Require a meaningful margin; ties and noisy/weak differences fall back.
  if (advantage < 10) return null;

  return {
    recommendedLevel: best,
    curriculumTopicKey: curriculumKeys[0],
    interventionCounts: counts,
    meanScoreChange: {
      hint: Math.round(means.hint * 10) / 10,
      method: Math.round(means.method * 10) / 10,
      solution: Math.round(means.solution * 10) / 10,
    },
    advantage,
    confidence: "exploratory",
    interpretation: "descriptive_not_causal",
  };
}
