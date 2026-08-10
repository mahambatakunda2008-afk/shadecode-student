import type { LearningCandidate } from "@/lib/learning-engine/shadecodeLearningUtility";
import type { TopicLearningState } from "./learningState";

export interface StateCandidateContext {
  id: string;
  type: LearningCandidate["type"];
  state: TopicLearningState;
  examUrgency?: number;
  goalAlignment?: number;
  curriculumGap?: number;
  prerequisiteValue?: number;
  estimatedMinutes?: number;
}

/** Translate the evolving learning state into the signals SLU understands. */
export function learningStateToCandidate(context: StateCandidateContext): LearningCandidate {
  const { state } = context;

  return {
    id: context.id,
    type: context.type,
    mastery: state.mastery,
    retentionRisk: 100 - state.retention,
    examUrgency: context.examUrgency ?? 0,
    prerequisiteValue: context.prerequisiteValue ?? state.prerequisiteHealth,
    goalAlignment: context.goalAlignment ?? 50,
    curriculumGap: context.curriculumGap ?? 100 - state.mastery,
    trendRisk: Math.max(0, 50 - state.recentImprovement),
    uncertainty: state.uncertainty,
    momentum: Math.max(0, 50 + state.recentImprovement),
    estimatedMinutes: context.estimatedMinutes ?? 15,
  };
}

export function learningStatesToCandidates(contexts: StateCandidateContext[]): LearningCandidate[] {
  return contexts.map(learningStateToCandidate);
}
