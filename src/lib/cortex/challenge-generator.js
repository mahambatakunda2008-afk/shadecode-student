import { cortexAnalyze } from "./engine";
import { generateLearningFocus } from "./learningEngine";

export function generateChallenge({
  student,
  snapshot,
}) {
  const cortexState = cortexAnalyze(student);

  const learningFocus = generateLearningFocus(snapshot);

  const weakest =
    snapshot.weakestSubjects?.[0];

  const strongest =
    snapshot.strongestSubjects?.[0];

  const completionRate =
    snapshot.totalTasks > 0
      ? snapshot.completedTasks / snapshot.totalTasks
      : 0;

  // Recovery mode
  if (cortexState.mode === "recovery") {
    return {
      title: "Momentum Builder",
      description:
        "Complete one short study session and finish one pending task.",
      xp_reward: 40,
      difficulty: "easy",
      reason: "recovery_mode",
      explanation: cortexState.message,
    };
  }

  // Poor exam performance
  if (
    typeof snapshot.lastExamScore === "number" &&
    snapshot.lastExamScore < 60
  ) {
    return {
      title: "Exam Recovery",
      description: `Review ${
        snapshot.lastExamSubject || "your recent exam subject"
      } for 20 minutes.`,
      xp_reward: 80,
      difficulty: "medium",
      reason: "exam_recovery",
      explanation:
        "Recent exam performance suggests targeted revision would help.",
    };
  }

  // Weak subject challenge
  if (weakest) {
    return {
      title: "Strengthen Weakness",
      description: `Study ${weakest} for 20 minutes.`,
      xp_reward: 60,
      difficulty: cortexState.difficulty,
      reason: "weak_subject",
      explanation: learningFocus.focus,
    };
  }

  // High performer challenge
  if (
    cortexState.mode === "elite" &&
    strongest
  ) {
    return {
      title: "Mastery Push",
      description: `Complete an advanced session in ${strongest}.`,
      xp_reward: 120,
      difficulty: "hard",
      reason: "mastery_push",
      explanation: cortexState.message,
    };
  }

  // Task completion challenge
  if (
    snapshot.pendingTasks > 0 &&
    completionRate < 0.7
  ) {
    return {
      title: "Task Sweep",
      description:
        "Complete two pending tasks today.",
      xp_reward: 70,
      difficulty: "medium",
      reason: "task_completion",
      explanation:
        "Reducing backlog improves learning momentum.",
    };
  }

  return {
    title: "Maintain Momentum",
    description:
      "Complete one focused study session today.",
    xp_reward: 50,
    difficulty: cortexState.difficulty,
    reason: "steady_progress",
    explanation: cortexState.message,
  };
}