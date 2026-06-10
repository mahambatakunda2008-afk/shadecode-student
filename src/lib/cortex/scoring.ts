// /lib/cortex/scoring.ts

import { StudentState } from "./engine";

export function computeLeaderboardScore(u: StudentState) {
  return Math.round(
    u.weekly_xp +
    u.level * 25 +
    u.streak * 10
  );
}

// Backwards-compatible placeholder used by CortexCore
export async function scoreAnswer(payload: any): Promise<{ score: number; feedback: string; weakTopics: string[] }> {
  // Simple deterministic scoring for now
  const score = Math.min(100, Math.floor(Math.random() * 100));
  const feedback = `Received answer. Score: ${score}.`;
  const weakTopics: string[] = [];
  return { score, feedback, weakTopics };
}