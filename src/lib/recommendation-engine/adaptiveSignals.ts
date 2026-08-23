export interface AdaptiveLearningSignal {
  outcome?: "mastered" | "marked" | "struggled";
  percentage?: number | null;
  weakAreas?: string[];
  strongAreas?: string[];
  timeSpentMs?: number | null;
}

export interface AdaptiveTopicState {
  topic: string;
  score: number;
  attempts: number;
  weak: boolean;
  strong: boolean;
}

/**
 * Convert a completed learning signal into a small, deterministic topic state.
 * This is deliberately pure: persistence remains owned by the existing
 * StudySpace/Cortex layers and recommendations remain safe to compute locally.
 */
export function deriveAdaptiveTopicStates(signal: AdaptiveLearningSignal): AdaptiveTopicState[] {
  const states = new Map<string, AdaptiveTopicState>();
  const percentage = signal.percentage == null ? undefined : Math.max(0, Math.min(100, signal.percentage));

  for (const topic of signal.weakAreas ?? []) {
    const key = topic.trim();
    if (!key) continue;
    states.set(key, {
      topic: key,
      score: percentage ?? 0,
      attempts: 1,
      weak: true,
      strong: false,
    });
  }

  for (const topic of signal.strongAreas ?? []) {
    const key = topic.trim();
    if (!key) continue;
    states.set(key, {
      topic: key,
      score: percentage ?? 100,
      attempts: 1,
      weak: false,
      strong: true,
    });
  }

  return [...states.values()];
}
