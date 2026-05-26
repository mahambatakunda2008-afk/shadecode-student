// src/lib/cortex/runtime/scores.ts

import {
  CortexEvent,
  CortexSnapshot,
} from "@/lib/cortex/types";

export interface CortexScores {
  consistencyScore: number;
  productivityScore: number;
  focusScore: number;
  fatigueScore: number;

  subjectStrengths: Record<string, number>;
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

/* ─────────────────────────────────────────────
   CONSISTENCY
───────────────────────────────────────────── */

function calculateConsistency(snapshot: CortexSnapshot): number {
  return clamp(snapshot.streak * 5);
}

/* ─────────────────────────────────────────────
   PRODUCTIVITY
───────────────────────────────────────────── */

function calculateProductivity(snapshot: CortexSnapshot): number {
  if (snapshot.totalTasks === 0) return 0;

  const ratio =
    snapshot.completedTasks / snapshot.totalTasks;

  return clamp(Math.round(ratio * 100));
}

/* ─────────────────────────────────────────────
   FOCUS
───────────────────────────────────────────── */

function calculateFocus(snapshot: CortexSnapshot): number {
  const subjectCount = snapshot.subjects.length;

  if (subjectCount === 0) return 0;

  // fewer active subjects = better focus
  return clamp(100 - subjectCount * 10);
}

/* ─────────────────────────────────────────────
   FATIGUE
───────────────────────────────────────────── */

function calculateFatigue(snapshot: CortexSnapshot): number {
  const overdueWeight = snapshot.pendingTasks * 12;

  return clamp(overdueWeight);
}

/* ─────────────────────────────────────────────
   SUBJECT STRENGTHS
───────────────────────────────────────────── */

function calculateSubjectStrengths(
  snapshot: CortexSnapshot
): Record<string, number> {
  const strengths: Record<string, number> = {};

  snapshot.subjects.forEach((subject) => {
    let base = 50;

    if (snapshot.strongestSubjects?.includes(subject)) {
      base += 25;
    }

    if (snapshot.weakestSubjects?.includes(subject)) {
      base -= 20;
    }

    strengths[subject] = clamp(base);
  });

  return strengths;
}

/* ─────────────────────────────────────────────
   MAIN SCORE ENGINE
───────────────────────────────────────────── */

export function calculateCortexScores(
  events: CortexEvent[],
  snapshot: CortexSnapshot
): CortexScores {
  return {
    consistencyScore: calculateConsistency(snapshot),

    productivityScore:
      calculateProductivity(snapshot),

    focusScore: calculateFocus(snapshot),

    fatigueScore: calculateFatigue(snapshot),

    subjectStrengths:
      calculateSubjectStrengths(snapshot),
  };
}
