export type VerifyTeachingStrategy =
  | "guided-reconstruction"
  | "worked-example"
  | "retrieval-and-transfer"
  | "diagnostic-first";

export interface VerifyTeachingStrategyInput {
  masteryScore?: number | null;
  attempts?: number;
  repeatedIncorrectResponses?: number;
  recurringMistakeCount?: number;
}

export interface VerifyTeachingStrategyResult {
  strategy: VerifyTeachingStrategy;
  reason: string;
  confidence: "low" | "moderate";
  evidence: "verified-topic-history" | "private-local-estimate" | "insufficient-history";
}

/**
 * Choose a teaching move from verified, same-topic learner evidence.
 * This is a pedagogical heuristic, not a learned preference or causal model.
 */
export function recommendVerifyTeachingStrategy(
  input: VerifyTeachingStrategyInput,
): VerifyTeachingStrategyResult {
  const mastery = typeof input.masteryScore === "number" && Number.isFinite(input.masteryScore)
    ? Math.max(0, Math.min(100, input.masteryScore))
    : null;
  const attempts = Math.max(0, Math.floor(input.attempts ?? 0));
  const repeated = Math.max(0, Math.floor(input.repeatedIncorrectResponses ?? 0));
  const recurring = Math.max(0, Math.floor(input.recurringMistakeCount ?? 0));

  if (mastery === null || attempts < 2) {
    return {
      strategy: "diagnostic-first",
      reason: "There is not enough verified same-topic history yet. Begin with one short diagnostic prompt and adapt from the student's response.",
      confidence: "low",
      evidence: "insufficient-history",
    };
  }
  if (repeated >= 2 || recurring >= 1) {
    return {
      strategy: "guided-reconstruction",
      reason: "Repeated independently marked errors exist. Ask focused questions that rebuild the missing reasoning before revealing a complete method.",
      confidence: "moderate",
      evidence: "verified-topic-history",
    };
  }
  if (mastery < 55) {
    return {
      strategy: "worked-example",
      reason: "Recent verified mastery evidence is weak. Model one small step at a time, explain why each step is valid, then ask the learner to complete the next step.",
      confidence: "moderate",
      evidence: "verified-topic-history",
    };
  }
  return {
    strategy: "retrieval-and-transfer",
    reason: "The available verified evidence supports an attempt-first approach. Ask the learner to retrieve the method, then apply it to a fresh transfer variation.",
    confidence: "moderate",
    evidence: "verified-topic-history",
  };
}

export function formatVerifyTeachingStrategy(
  result: VerifyTeachingStrategyResult,
): string {
  const instructions: Record<VerifyTeachingStrategy, string> = {
    "diagnostic-first": "Start with one brief diagnostic question or ask the learner to identify their next step. Do not assume a preferred learning style. Adapt after seeing their response.",
    "guided-reconstruction": "Use guided questioning: identify the first uncertain step, ask one focused question at a time, and let the learner reconstruct the reasoning. Do not jump straight to a full solution unless the selected help level permits it.",
    "worked-example": "Use a compact worked example with each decision explained. Then leave one analogous step for the learner to complete. Keep the worked example within the selected help level.",
    "retrieval-and-transfer": "Invite the learner to recall the key method before explaining it. Then use a fresh transfer variation or ask them to apply the method to a changed condition. Do not repeat the identical question.",
  };
  return `TEACHING STRATEGY: ${result.strategy} (${result.confidence} confidence; ${result.evidence}). ${result.reason} ${instructions[result.strategy]} Use a diagram, graph, table, simulation, or practical analogy only when it genuinely clarifies this specific concept; do not force visuals or infer a visual-learning preference.`;
}

/** Offline policy using only this account's local Verify cache. */
export function recommendPrivateLocalVerifyTeachingStrategy(input: VerifyTeachingStrategyInput): VerifyTeachingStrategyResult {
  const result = recommendVerifyTeachingStrategy(input);
  return {
    ...result,
    evidence: result.evidence === "insufficient-history" ? "insufficient-history" : "private-local-estimate",
    confidence: result.evidence === "verified-topic-history" ? "low" : result.confidence,
    reason: result.evidence === "verified-topic-history" ? `Local estimate only. ${result.reason}` : result.reason,
  };
}
