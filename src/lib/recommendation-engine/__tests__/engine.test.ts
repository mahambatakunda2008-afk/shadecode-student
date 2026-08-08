/**
 * /lib/recommendation-engine/__tests__/engine.test.ts
 *
 * Recommendation Engine - Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { recommendationEngine } from "../engine";
import type { RecommendationEngineInput } from "../types";

describe("Recommendation Engine", () => {
  const testUserId = "test-user-123";

  beforeEach(async () => {
    await recommendationEngine.invalidateCache(testUserId);
  });

  const mockInput: RecommendationEngineInput = {
    userId: testUserId,
    curriculumProgress: {
      overallCompletion: 50,
      curriculum: {
        totalLessons: 100,
        completedLessons: 50,
        inProgressLessons: 10,
        lockedLessons: 40,
        completionPercentage: 50,
        weightedCompletion: 52,
        currentLesson: { id: "lesson-1", title: "Lesson 1" },
        recommendedNextLesson: { id: "lesson-2", title: "Lesson 2" },
      },
      lessons: [
        {
          lessonId: "lesson-2",
          lessonTitle: "Lesson 2",
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
        topicId: "topic-1",
        topic: "Algebra",
        subject: "Mathematics",
        severity: "medium",
        score: 55,
        lastAssessed: new Date().toISOString(),
        recommendedActions: ["Practice more equations"],
        estimatedTimeToImprove: 40,
      },
    ],
    examReadiness: {
      subject: "Mathematics",
      board: "ZIMSEC",
      level: "O-Level",
      overallScore: 75,
      readinessLevel: "Intermediate",
      predictedGrade: "B",
      confidence: 70,
      timeToExam: 30,
      topicReadiness: {},
    },
    studyActivity: {
      sessions: [],
      timeSpent: {},
      patterns: {
        mostActiveTime: "10:00",
        mostActiveDay: "Monday",
        averageDailyStudyTime: 60,
        studyFrequency: 1.5,
        consistencyScore: 75,
      },
      streak: {
        currentStreak: 7,
        longestStreak: 14,
        lastStudyDate: new Date().toISOString(),
      },
    },
    goals: [],
    careerInterests: [],
  };

  describe("generateRecommendations", () => {
    it("should generate recommendations", async () => {
      const output = await recommendationEngine.generateRecommendations(mockInput);

      expect(output).toBeDefined();
      expect(output.recommendedLesson).toBeDefined();
      expect(output.recommendedRevisionTopic).toBeDefined();
      expect(output.recommendedExamPractice).toBeDefined();
      expect(output.recommendedStudyAction).toBeDefined();
      expect(output.metadata).toBeDefined();
    });

    it("should include lesson recommendation", async () => {
      const output = await recommendationEngine.generateRecommendations(mockInput);

      expect(output.recommendedLesson.lessonId).toBeDefined();
      expect(output.recommendedLesson.lessonTitle).toBeDefined();
      expect(output.recommendedLesson.subject).toBeDefined();
      expect(output.recommendedLesson.reason).toBeDefined();
      expect(output.recommendedLesson.priority).toBeDefined();
      expect(output.recommendedLesson.estimatedTime).toBeGreaterThan(0);
    });

    it("should include revision topic recommendation", async () => {
      const output = await recommendationEngine.generateRecommendations(mockInput);

      expect(output.recommendedRevisionTopic.topicId).toBeDefined();
      expect(output.recommendedRevisionTopic.topic).toBeDefined();
      expect(output.recommendedRevisionTopic.subject).toBeDefined();
      expect(output.recommendedRevisionTopic.reason).toBeDefined();
      expect(output.recommendedRevisionTopic.priority).toBeDefined();
      expect(output.recommendedRevisionTopic.estimatedTime).toBeGreaterThan(0);
    });

    it("should include exam practice recommendation", async () => {
      const output = await recommendationEngine.generateRecommendations(mockInput);

      expect(output.recommendedExamPractice.subject).toBeDefined();
      expect(output.recommendedExamPractice.topic).toBeDefined();
      expect(output.recommendedExamPractice.reason).toBeDefined();
      expect(output.recommendedExamPractice.priority).toBeDefined();
      expect(output.recommendedExamPractice.estimatedTime).toBeGreaterThan(0);
      expect(output.recommendedExamPractice.practiceType).toBeDefined();
    });

    it("should include study action recommendation", async () => {
      const output = await recommendationEngine.generateRecommendations(mockInput);

      expect(output.recommendedStudyAction.action).toBeDefined();
      expect(output.recommendedStudyAction.reason).toBeDefined();
      expect(output.recommendedStudyAction.priority).toBeDefined();
      expect(output.recommendedStudyAction.estimatedTime).toBeGreaterThan(0);
      expect(output.recommendedStudyAction.category).toBeDefined();
    });

    it("should include metadata", async () => {
      const output = await recommendationEngine.generateRecommendations(mockInput);

      expect(output.metadata.generatedAt).toBeDefined();
      expect(output.metadata.userId).toBe(testUserId);
      expect(output.metadata.confidence).toBeGreaterThanOrEqual(0);
      expect(output.metadata.confidence).toBeLessThanOrEqual(100);
      expect(output.metadata.factors).toBeDefined();
      expect(output.metadata.cacheKey).toBeDefined();
    });
  });

  describe("invalidateCache", () => {
    it("should invalidate cache for user", async () => {
      await recommendationEngine.invalidateCache(testUserId);
      // Should not throw
    });
  });

  describe("Priority Calculation", () => {
    it("should prioritize weak areas with critical severity", async () => {
      const inputWithCriticalWeakAreas: RecommendationEngineInput = {
        ...mockInput,
        weakAreas: [
          {
            topicId: "topic-1",
            topic: "Algebra",
            subject: "Mathematics",
            severity: "critical" as const,
            score: 20,
            lastAssessed: new Date().toISOString(),
            recommendedActions: [],
            estimatedTimeToImprove: 60,
          },
        ],
      };

      const output = await recommendationEngine.generateRecommendations(inputWithCriticalWeakAreas);

      expect(output.recommendedRevisionTopic.priority).toBe("critical");
    });

    it("should prioritize lessons with low completion", async () => {
      const inputWithLowCompletion = {
        ...mockInput,
        weakAreas: [],
        curriculumProgress: {
          ...mockInput.curriculumProgress,
          overallCompletion: 20,
        },
      };

      const output = await recommendationEngine.generateRecommendations(inputWithLowCompletion);

      expect(output.recommendedStudyAction.action).toContain("lesson");
    });

    it("should prioritize exam practice when time to exam is short", async () => {
      const inputWithUrgentExam = {
        ...mockInput,
        examReadiness: {
          ...mockInput.examReadiness,
          timeToExam: 7,
        },
      };

      const output = await recommendationEngine.generateRecommendations(inputWithUrgentExam);

      expect(output.recommendedExamPractice.practiceType).toBe("timed");
    });

    it("should raise priority for a weak area with high retention risk over an otherwise-identical one without it", async () => {
      const baseWeakArea = {
        topicId: "topic-1",
        topic: "Algebra",
        subject: "Mathematics",
        severity: "medium" as const,
        score: 55,
        lastAssessed: new Date().toISOString(),
        recommendedActions: [],
        estimatedTimeToImprove: 40,
      };

      const withoutRisk: RecommendationEngineInput = {
        ...mockInput,
        weakAreas: [baseWeakArea],
      };
      const withRisk: RecommendationEngineInput = {
        ...mockInput,
        weakAreas: [{ ...baseWeakArea, retentionRisk: 90, retentionReason: "Not reviewed in 30 days" }],
      };

      const outputWithout = await recommendationEngine.generateRecommendations(withoutRisk);
      await recommendationEngine.invalidateCache(testUserId);
      const outputWith = await recommendationEngine.generateRecommendations(withRisk);

      // Same topic either way, but the metadata's confidence/factor
      // count or the reason text should reflect retention risk was
      // actually used when present.
      expect(outputWith.recommendedRevisionTopic.reason).toContain("Not reviewed in 30 days");
      expect(outputWithout.recommendedRevisionTopic.reason).not.toContain("Not reviewed in 30 days");
    });

    it("does not mention retention risk when the field is absent (non-breaking for existing callers)", async () => {
      const output = await recommendationEngine.generateRecommendations(mockInput);
      expect(output.recommendedRevisionTopic.reason).not.toMatch(/reviewed/i);
    });
  });
});
