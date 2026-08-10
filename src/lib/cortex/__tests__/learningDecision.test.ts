import { describe, expect, it } from "vitest";
import type { RecommendationEngineInput } from "@/lib/recommendation-engine/types";
import { buildLearningCandidates, chooseNextBestLearningMove } from "../learningDecision";

const input: RecommendationEngineInput = {
  userId: "test-user",
  curriculumProgress: {
    overallCompletion: 42,
    curriculum: {
      totalLessons: 100,
      completedLessons: 42,
      inProgressLessons: 4,
      lockedLessons: 54,
      completionPercentage: 42,
      weightedCompletion: 40,
      currentLesson: { id: "lesson-current", title: "Current" },
      recommendedNextLesson: { id: "lesson-next", title: "Next" },
    },
    lessons: [
      {
        lessonId: "lesson-next",
        lessonTitle: "Next",
        subject: "Mathematics",
        progress: 0,
        completed: false,
        lastAttempted: new Date().toISOString(),
        timeSpent: 0,
        attempts: 0,
      },
    ],
    subjects: [],
  },
  weakAreas: [
    {
      topicId: "algebra",
      topic: "Algebra",
      subject: "Mathematics",
      severity: "critical",
      score: 25,
      lastAssessed: new Date().toISOString(),
      recommendedActions: ["Practice equations"],
      estimatedTimeToImprove: 30,
      retentionRisk: 90,
      retentionReason: "Not reviewed recently",
    },
  ],
  examReadiness: {
    subject: "Mathematics",
    board: "Cambridge",
    level: "AS",
    overallScore: 60,
    readinessLevel: "Basic",
    predictedGrade: "C",
    confidence: 70,
    timeToExam: 10,
    topicReadiness: {},
  },
  studyActivity: {
    sessions: [],
    timeSpent: {},
    patterns: {
      mostActiveTime: "18:00",
      mostActiveDay: "Monday",
      averageDailyStudyTime: 45,
      studyFrequency: 3,
      consistencyScore: 65,
    },
    streak: { currentStreak: 4, longestStreak: 8, lastStudyDate: new Date().toISOString() },
  },
  goals: [{ id: "g1", goal: "Improve Mathematics", priority: "high", completed: false }],
  careerInterests: [],
};

describe("Cortex learning decision adapter", () => {
  it("turns existing recommendation state into candidates", () => {
    const candidates = buildLearningCandidates(input);

    expect(candidates.some((candidate) => candidate.id === "algebra")).toBe(true);
    expect(candidates.some((candidate) => candidate.id === "lesson-next")).toBe(true);
    expect(candidates.some((candidate) => candidate.id === "exam:Mathematics")).toBe(true);
  });

  it("preserves retention risk when it exists", () => {
    const algebra = buildLearningCandidates(input).find((candidate) => candidate.id === "algebra");
    expect(algebra?.retentionRisk).toBe(90);
  });

  it("uses a safe fallback when retention risk is unavailable", () => {
    const withoutRisk: RecommendationEngineInput = {
      ...input,
      weakAreas: [{ ...input.weakAreas[0], retentionRisk: undefined }],
    };
    const algebra = buildLearningCandidates(withoutRisk).find((candidate) => candidate.id === "algebra");
    expect(algebra?.retentionRisk).toBeGreaterThan(0);
  });

  it("can choose a next-best move without an AI call", () => {
    const decision = chooseNextBestLearningMove(input);

    expect(decision).not.toBeNull();
    expect(decision?.score).toBeGreaterThanOrEqual(0);
    expect(decision?.candidate.id).toBeDefined();
    expect(decision?.reason).toContain("utility=");
  });
});
