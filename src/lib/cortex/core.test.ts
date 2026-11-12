import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./memory", () => ({
  getMemory: vi.fn(),
  updateMemory: vi.fn(),
}));

vi.mock("./student-context", () => ({
  resolveAuthenticatedCortexStudentContext: vi.fn(),
}));

vi.mock("./events", () => ({
  recordVerifiedPracticeAttempt: vi.fn(),
}));

vi.mock("./tools/tutor", () => ({
  generateTutoringResponse: vi.fn(),
}));

vi.mock("@/lib/curriculum", () => ({
  getCurriculumState: vi.fn(),
}));

vi.mock("./memoryTracker", () => ({
  trackStudySession: vi.fn(),
  trackExamResult: vi.fn(),
  updateStreak: vi.fn(),
  generateRecommendation: vi.fn(),
}));

import { getMemory, updateMemory } from "./memory";
import { resolveAuthenticatedCortexStudentContext } from "./student-context";
import { recordVerifiedPracticeAttempt } from "./events";
import { generateTutoringResponse } from "./tools/tutor";
import { getCurriculumState } from "@/lib/curriculum";
import {
  generateRecommendation,
  trackExamResult,
  trackStudySession,
  updateStreak,
} from "./memoryTracker";
import { CortexCore } from "./core";

const memory = {
  level: 1,
  streak: 0,
  xp: 0,
  totalTasks: 0,
  completedTasks: 0,
  subjects: [],
  weakTopics: [],
  weakSubjects: [],
  strongSubjects: [],
  frequentlyStudiedSubjects: [],
  preferredStudyHours: [],
  averageSessionDuration: 0,
  totalStudySessions: 0,
  examScores: [],
  averageExamScore: 0,
  longestStreak: 0,
  totalLessonsCompleted: 0,
  totalStudyTimeMinutes: 0,
};

describe("CortexCore learning requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMemory).mockResolvedValue(memory);
    vi.mocked(updateMemory).mockResolvedValue(memory);
    vi.mocked(recordVerifiedPracticeAttempt).mockResolvedValue({ recorded: true });
    vi.mocked(resolveAuthenticatedCortexStudentContext).mockRejectedValue(new Error("No session context in this unit test."));
    vi.mocked(generateTutoringResponse).mockResolvedValue("A tutoring response.");
    vi.mocked(getCurriculumState).mockRejectedValue(new Error("Curriculum is not needed in this unit test."));
    vi.mocked(generateRecommendation).mockResolvedValue("Continue with your next topic.");
  });

  it("does not count a tutoring request as a completed study session", async () => {
    await CortexCore({
      userId: "learner-1",
      type: "learn",
      payload: {
        topic: "Photosynthesis",
        subjectId: "biology",
        subjectName: "Biology",
        durationMinutes: 15,
      },
    });

    expect(trackStudySession).not.toHaveBeenCalled();
    expect(updateStreak).not.toHaveBeenCalled();
    expect(updateMemory).toHaveBeenCalledWith("learner-1", {
      lastTopic: "Photosynthesis",
    });
  });

  it("persists practice scores separately from formal exam averages", async () => {
    await CortexCore({
      userId: "learner-1",
      type: "practice",
      payload: {
        topic: "Quadratic equations",
        subjectName: "Mathematics",
        answer: "x = 2",
        correctAnswer: "x = 2",
      },
    });

    expect(updateMemory).toHaveBeenCalledWith("learner-1", {
      lastPracticeScore: 100,
      lastPracticeTopic: "Quadratic equations",
      lastPracticeSubject: "Mathematics",
      lastPracticeSyllabusId: null,
    });
    expect(updateMemory).not.toHaveBeenCalledWith("learner-1", expect.objectContaining({
      weakTopics: [],
    }));
    expect(trackStudySession).not.toHaveBeenCalled();
    expect(trackExamResult).not.toHaveBeenCalled();
  });

  it("records only verified practice against the resolved syllabus without storing answers", async () => {
    await CortexCore({
      userId: "learner-1",
      accessToken: "learner-access-token",
      type: "practice",
      curriculum: { identity: { syllabusId: "cambridge-9700", subjectId: "biology" } } as any,
      payload: {
        attemptId: "attempt-1",
        questionId: "question-1",
        subjectId: "biology-id",
        subjectName: "Biology",
        topicId: "photosynthesis",
        answer: "correct answer text",
        correctAnswer: "correct answer text",
      },
    });

    expect(recordVerifiedPracticeAttempt).toHaveBeenCalledWith({
      userId: "learner-1",
      accessToken: "learner-access-token",
      payload: expect.objectContaining({ attemptId: "attempt-1" }),
      subjectId: "biology",
      score: 100,
      syllabusId: "cambridge-9700",
    });
  });

  it("does not persist a score when no marking guide is available", async () => {
    const result = await CortexCore({
      userId: "learner-1",
      type: "practice",
      payload: {
        topic: "Photosynthesis",
        answer: "A long response that has not been checked against a marking guide.",
      },
    });

    expect(result.nextAction).toBe("review_with_marking_guide");
    expect(updateMemory).toHaveBeenCalledWith("learner-1", {
      lastTopic: "Photosynthesis",
    });
    expect(updateMemory).not.toHaveBeenCalledWith("learner-1", expect.objectContaining({
      lastPracticeScore: expect.any(Number),
    }));
  });

  it("stores only bounded text feedback", async () => {
    await CortexCore({
      userId: "learner-1",
      type: "feedback",
      payload: { feedback: "Use more worked examples." },
    });

    expect(updateMemory).toHaveBeenCalledWith("learner-1", {
      feedback: "Use more worked examples.",
    });
  });

  it("caps feedback before persisting it", async () => {
    const feedback = "x".repeat(700);
    await CortexCore({
      userId: "learner-1",
      type: "feedback",
      payload: { feedback },
    });

    expect(updateMemory).toHaveBeenCalledWith("learner-1", {
      feedback: "x".repeat(500),
    });
  });
});
