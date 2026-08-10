import type { RecommendationEngineInput } from "@/lib/recommendation-engine/types";
import {
  chooseNextLearningMove,
  type LearningCandidate,
  type LearningDecision,
} from "@/lib/learning-engine/shadecodeLearningUtility";

/**
 * Converts the existing Student Intelligence state into SLU candidates.
 *
 * This is an adapter, not a replacement for RecommendationEngine. Keeping
 * the boundary explicit lets us compare the two systems before changing any
 * production recommendation behavior.
 */
export function buildLearningCandidates(input: RecommendationEngineInput): LearningCandidate[] {
  const candidates: LearningCandidate[] = [];
  const highPriorityGoals = input.goals.filter((goal) => !goal.completed && goal.priority === "high").length;
  const goalAlignment = highPriorityGoals > 0 ? 80 : input.goals.some((goal) => !goal.completed) ? 55 : 35;
  const examUrgency = examUrgencyScore(input.examReadiness.timeToExam);

  for (const weakArea of input.weakAreas) {
    candidates.push({
      id: weakArea.topicId,
      type: "revision",
      mastery: weakArea.score,
      retentionRisk: weakArea.retentionRisk ?? severityRetentionFallback(weakArea.severity),
      examUrgency: input.examReadiness.subject === weakArea.subject ? examUrgency : examUrgency * 0.55,
      prerequisiteValue: severityPrerequisiteValue(weakArea.severity),
      goalAlignment: subjectGoalAlignment(weakArea.subject, input, goalAlignment),
      curriculumGap: 100 - input.curriculumProgress.overallCompletion,
      trendRisk: weakArea.severity === "critical" ? 85 : weakArea.severity === "high" ? 65 : 35,
      uncertainty: weakArea.retentionRisk === undefined ? 35 : 15,
      momentum: input.studyActivity.patterns.consistencyScore,
      estimatedMinutes: Math.max(10, weakArea.estimatedTimeToImprove || 30),
    });
  }

  for (const lesson of input.curriculumProgress.lessons.filter((item) => !item.completed)) {
    const mastery = Math.max(0, Math.min(100, lesson.progress));
    const inProgress = lesson.progress > 0 && lesson.progress < 100;

    candidates.push({
      id: lesson.lessonId,
      type: "lesson",
      mastery,
      retentionRisk: inProgress ? 25 : 10,
      examUrgency: input.examReadiness.subject === lesson.subject ? examUrgency * 0.8 : examUrgency * 0.35,
      prerequisiteValue: input.curriculumProgress.curriculum.currentLesson?.id === lesson.lessonId ? 85 : 45,
      goalAlignment: subjectGoalAlignment(lesson.subject, input, goalAlignment),
      curriculumGap: 100 - mastery,
      trendRisk: 20,
      uncertainty: lesson.attempts === 0 ? 70 : 25,
      momentum: input.studyActivity.patterns.consistencyScore,
      estimatedMinutes: 30,
    });
  }

  if (input.examReadiness.subject) {
    candidates.push({
      id: `exam:${input.examReadiness.subject}`,
      type: input.examReadiness.timeToExam <= 14 ? "exam" : "practice",
      mastery: input.examReadiness.overallScore,
      retentionRisk: Math.max(0, 100 - input.examReadiness.overallScore),
      examUrgency,
      prerequisiteValue: 70,
      goalAlignment: subjectGoalAlignment(input.examReadiness.subject, input, goalAlignment),
      curriculumGap: Math.max(0, 100 - input.curriculumProgress.overallCompletion),
      trendRisk: input.examReadiness.overallScore < 60 ? 70 : 25,
      uncertainty: Math.max(0, 100 - input.examReadiness.confidence),
      momentum: input.studyActivity.patterns.consistencyScore,
      estimatedMinutes: input.examReadiness.timeToExam <= 14 ? 60 : 45,
    });
  }

  return candidates;
}

export function chooseNextBestLearningMove(input: RecommendationEngineInput): LearningDecision | null {
  return chooseNextLearningMove(buildLearningCandidates(input));
}

function examUrgencyScore(days: number): number {
  if (days <= 0) return 100;
  if (days <= 7) return 100;
  if (days <= 14) return 90;
  if (days <= 30) return 75;
  if (days <= 60) return 50;
  return 20;
}

function severityRetentionFallback(severity: "critical" | "high" | "medium" | "low"): number {
  return { critical: 85, high: 65, medium: 45, low: 25 }[severity];
}

function severityPrerequisiteValue(severity: "critical" | "high" | "medium" | "low"): number {
  return { critical: 90, high: 75, medium: 50, low: 30 }[severity];
}

function subjectGoalAlignment(subject: string, input: RecommendationEngineInput, fallback: number): number {
  const careerMatch = input.careerInterests.some((career) =>
    career.recommendedSubjects.some((candidate) => candidate.toLowerCase() === subject.toLowerCase())
  );
  if (careerMatch) return 90;

  const subjectGoal = input.goals.some((goal) =>
    !goal.completed && goal.goal.toLowerCase().includes(subject.toLowerCase())
  );
  return subjectGoal ? Math.max(fallback, 75) : fallback;
}
