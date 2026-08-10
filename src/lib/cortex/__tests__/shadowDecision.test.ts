import { describe, expect, it } from "vitest";
import type { RecommendationEngineInput, RecommendationEngineOutput } from "@/lib/recommendation-engine/types";
import { compareLearningDecisions } from "../shadowDecision";

const input = {
  userId: "shadow-test",
  curriculumProgress: {
    overallCompletion: 20,
    curriculum: {
      totalLessons: 10,
      completedLessons: 2,
      inProgressLessons: 1,
      lockedLessons: 7,
      completionPercentage: 20,
      weightedCompletion: 20,
      currentLesson: { id: "l1", title: "Algebra" },
      recommendedNextLesson: { id: "l2", title: "Functions" },
    },
    lessons: [{
      lessonId: "l2",
      lessonTitle: "Functions",
      subject: "Mathematics",
      progress: 0,
      completed: false,
      lastAttempted: new Date().toISOString(),
      timeSpent: 0,
      attempts: 0,
    }],
    subjects: [],
  },
  weakAreas: [{
    topicId: "algebra",
    topic: "Algebra",
    subject: "Mathematics",
    severity: "critical" as const,
    score: 20,
    lastAssessed: new Date().toISOString(),
    recommendedActions: ["Practice"],
    estimatedTimeToImprove: 20,
    retentionRisk: 90,
  }],
  examReadiness: {
    subject: "Mathematics",
    board: "Cambridge",
    level: "AS",
    overallScore: 40,
    readinessLevel: "Basic" as const,
    predictedGrade: "D",
    confidence: 70,
    timeToExam: 30,
    topicReadiness: {},
  },
  studyActivity: {
    sessions: [],
    timeSpent: {},
    patterns: { mostActiveTime: "18:00", mostActiveDay: "Monday", averageDailyStudyTime: 30, studyFrequency: 2, consistencyScore: 40 },
    streak: { currentStreak: 1, longestStreak: 3, lastStudyDate: new Date().toISOString() },
  },
  goals: [{ id: "g1", goal: "Improve Mathematics", priority: "high" as const, completed: false }],
  careerInterests: [],
} satisfies RecommendationEngineInput;

const legacy = {
  recommendedLesson: { lessonId: "l2", lessonTitle: "Functions", subject: "Mathematics", reason: "next", priority: "high" as const, estimatedTime: 20, prerequisites: [] },
  recommendedRevisionTopic: { topicId: "algebra", topic: "Algebra", subject: "Mathematics", reason: "weak", priority: "high" as const, estimatedTime: 20, recommendedActions: ["Practice"] },
  recommendedExamPractice: { subject: "Mathematics", topic: "Algebra", reason: "exam", priority: "medium" as const, estimatedTime: 30, practiceType: "topic_specific" as const },
  recommendedStudyAction: { action: "Revise algebra", reason: "weak", priority: "high" as const, estimatedTime: 20, category: "revision" as const },
  metadata: { generatedAt: new Date().toISOString(), userId: "shadow-test", confidence: 70, factors: [], cacheKey: "test" },
} satisfies RecommendationEngineOutput;

describe("Shadow Cortex", () => {
  it("compares legacy and SLU without changing either decision", () => {
    const result = compareLearningDecisions(input, legacy);
    expect(result.legacy?.category).toBe("revision");
    expect(result.slu).not.toBeNull();
    expect(["agree", "disagree"]).toContain(result.agreement);
  });

  it("works without a legacy recommendation", () => {
    const result = compareLearningDecisions(input);
    expect(result.legacy).toBeNull();
    expect(result.slu).not.toBeNull();
    expect(result.agreement).toBe("unavailable");
  });
});
