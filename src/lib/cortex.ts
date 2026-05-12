import type {
  CortexSnapshot,
  CortexEvent,
  CortexBehaviorInsightPayload,
  CortexBehaviorSummaryPayload,
} from "../types";

/* ─────────────────────────────────────────────
   CORE CORTEX ENGINE (SAFE + EXTENSIBLE)
   ───────────────────────────────────────────── */

/**
 * Generate a lightweight behavioral insight.
 * Used by: Tasks, Exams, Timetable (future unified layer)
 */
export async function generateInsight(params: CortexBehaviorInsightPayload) {
  const { snapshot } = params;

  const completionRate =
    snapshot.totalTasks > 0
      ? snapshot.completedTasks / snapshot.totalTasks
      : 0;

  const streak = snapshot.streak || 0;
  const xp = snapshot.xp || 0;

  let insight = "";

  // 🧠 behavioral logic (simple but scalable)
  if (streak >= 10 && completionRate > 0.8) {
    insight =
      "You are in high discipline mode. Your consistency is shaping strong academic momentum.";
  } else if (streak >= 5) {
    insight =
      "You are building consistency. Maintain your rhythm to unlock higher performance.";
  } else if (completionRate > 0.7) {
    insight =
      "Good task execution, but consistency is unstable. Focus on daily structure.";
  } else if (completionRate > 0.4) {
    insight =
      "Your activity is irregular. Small daily wins will stabilize performance.";
  } else {
    insight =
      "Low engagement detected. Start with smaller tasks to rebuild momentum.";
  }

  return {
    insight,
  };
}

/**
 * Summarize behavior from free-text (future AI expansion hook)
 */
export async function generateBehaviorSummary(
  params: CortexBehaviorSummaryPayload
) {
  const { behaviorSummary } = params;

  return {
    insight: behaviorSummary || "No behavior data available.",
  };
}

/* ─────────────────────────────────────────────
   EXAM → CORTEX UPDATE ENGINE (existing logic safe)
   ───────────────────────────────────────────── */

/**
 * Updates Cortex state after exam completion
 * (kept compatible with your existing system)
 */
export async function updateCortexFromExam(params: {
  snapshot: CortexSnapshot;
  score: number;
  weakAreas?: string[];
  strongAreas?: string[];
  events?: CortexEvent[];
}) {
  const { snapshot, score } = params;

  const performanceLevel =
    score >= 80 ? "excellent" :
    score >= 60 ? "good" :
    score >= 40 ? "average" :
    "weak";

  let insight = "";

  switch (performanceLevel) {
    case "excellent":
      insight =
        "Excellent performance. You demonstrate strong mastery and exam readiness.";
      break;
    case "good":
      insight =
        "Good performance. A few refinements can push you into top mastery.";
      break;
    case "average":
      insight =
        "Average performance. Focus on weak topics and structured revision.";
      break;
    default:
      insight =
        "Weak performance detected. Prioritize fundamentals before advancing.";
  }

  return {
    updatedSnapshot: snapshot,
    insight,
  };
}
