// /lib/cortex/engine.ts

export interface StudentState {
  id: string;
  xp: number;
  level: number;
  streak: number;
  weekly_xp: number;
  last_active: string;
  completed_tasks: number;
  total_tasks: number;
}

export function computeScore(s: StudentState) {
  const completion =
    s.total_tasks > 0 ? s.completed_tasks / s.total_tasks : 0;

  return (
    s.weekly_xp +
    s.level * 50 +
    s.streak * 20 +
    completion * 100
  );
}

export function cortexAnalyze(s: StudentState) {
  const score = computeScore(s);

  const inactiveDays =
    (Date.now() - new Date(s.last_active).getTime()) /
    (1000 * 60 * 60 * 24);

  if (score < 200 || inactiveDays > 3) {
    return {
      mode: "recovery",
      message: "Rebuild consistency with low-pressure tasks.",
      difficulty: "easy",
    };
  }

  if (score > 1200) {
    return {
      mode: "elite",
      message: "Elite performance detected. Increasing challenge.",
      difficulty: "hard",
    };
  }

  return {
    mode: "stable",
    message: "Maintain steady learning rhythm.",
    difficulty: "normal",
  };
}
