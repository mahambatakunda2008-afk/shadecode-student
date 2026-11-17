import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./runtime/execution", () => ({ executeCortexText: vi.fn() }));

vi.mock("./runtime/knowledge-sources", () => ({ retrieveCortexKnowledge: vi.fn() }));

vi.mock("./memory", () => ({
  getMemory: vi.fn(),
  updateMemory: vi.fn(),
}));

vi.mock("./student-context", () => ({
  resolveAuthenticatedCortexStudentContext: vi.fn(),
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
import { generateTutoringResponse } from "./tools/tutor";
import { getCurriculumState } from "@/lib/curriculum";
import {
  generateRecommendation,
  trackExamResult,
  trackStudySession,
  updateStreak,
} from "./memoryTracker";
import { CortexCore } from "./core";
import { executeCortexText } from "./runtime/execution";
import { retrieveCortexKnowledge } from "./runtime/knowledge-sources";

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
    vi.mocked(resolveAuthenticatedCortexStudentContext).mockRejectedValue(new Error("No session context in this unit test."));
    vi.mocked(generateTutoringResponse).mockResolvedValue("A tutoring response.");
    vi.mocked(getCurriculumState).mockRejectedValue(new Error("Curriculum is not needed in this unit test."));
    vi.mocked(generateRecommendation).mockResolvedValue("Continue with your next topic.");
    vi.mocked(executeCortexText).mockResolvedValue(null);
    vi.mocked(retrieveCortexKnowledge).mockResolvedValue({ status: "not_configured", sources: [] });
  });

  it("returns the tutoring answer when optional memory persistence fails", async () => {
    vi.mocked(updateMemory).mockRejectedValueOnce(new Error("temporary storage failure"));

    const result = await CortexCore({ userId: "learner-1", type: "learn", payload: { topic: "Photosynthesis" } });

    expect(result.response).toBe("A tutoring response.");
    expect(result.nextAction).toBe("continue_learning");
    expect(result.updatedState?.snapshot.level).toBe(1);
  });

  it("returns the tutoring answer when recommendation enrichment fails", async () => {
    vi.mocked(generateRecommendation).mockRejectedValueOnce(new Error("recommendation unavailable"));

    const result = await CortexCore({ userId: "learner-1", type: "learn", payload: { topic: "Photosynthesis" } });

    expect(result.response).toBe("A tutoring response.");
    expect(result.recommendation).toBeUndefined();
    expect(result.updatedState?.snapshot.level).toBe(1);
  });


  it("keeps deterministic tutoring available when opt-in online research is not configured", async () => {
    const result = await CortexCore({
      userId: "learner-1",
      type: "learn",
      curriculum: { identity: { boardId: "cambridge", qualificationId: "AS", syllabusId: "9700", syllabusVersion: "2025-2027", subjectId: "biology" } } as any,
      payload: { topic: "Photosynthesis", subjectName: "Biology", research: true },
    });

    expect(result.response).toBe("A tutoring response.");
    expect(result.researchStatus).toBe("not_configured");
    expect(result.sources).toEqual([]);
    expect(executeCortexText).not.toHaveBeenCalled();
  });


  it("does not search the web without a verified curriculum context", async () => {
    const result = await CortexCore({
      userId: "learner-1",
      type: "learn",
      payload: { topic: "Photosynthesis", research: true },
    });

    expect(result.response).toBe("A tutoring response.");
    expect(result.researchStatus).toBe("unavailable");
    expect(result.sources).toEqual([]);
    expect(retrieveCortexKnowledge).not.toHaveBeenCalled();
  });

  it("uses retrieved sources for AI synthesis and returns their provenance separately", async () => {
    const sources = [{
      title: "Photosynthesis reference",
      url: "https://example.org/photosynthesis",
      publisher: "Example publisher",
      retrievedAt: "2026-11-17T00:00:00.000Z",
      verificationStatus: "unverified" as const,
      extraction: "independently_fetched" as const,
      content: "Chlorophyll absorbs light energy used in photosynthesis.",
    }];
    vi.mocked(retrieveCortexKnowledge).mockResolvedValue({ status: "available", sources });
    vi.mocked(executeCortexText).mockResolvedValue("Chlorophyll absorbs light energy.");

    const result = await CortexCore({
      userId: "learner-1",
      type: "learn",
      payload: { topic: "Photosynthesis", subjectName: "Biology", research: true },
    });

    expect(result.response).toBe("Chlorophyll absorbs light energy.");
    expect(result.researchStatus).toBe("available");
    expect(result.sources).toEqual(sources);
    expect(executeCortexText).toHaveBeenCalledWith(
      expect.stringContaining("UNVERIFIED"),
      700,
      expect.objectContaining({ operation: "learn.research.synthesis", userId: "learner-1" }),
    );
  });

  it("preserves deterministic tutoring when AI synthesis fails after successful retrieval", async () => {
    vi.mocked(retrieveCortexKnowledge).mockResolvedValue({
      status: "available",
      sources: [{
        title: "Reference",
        url: "https://example.org/reference",
        publisher: "Example",
        retrievedAt: "2026-11-17T00:00:00.000Z",
        verificationStatus: "unverified",
        extraction: "search_excerpt_only",
        content: "A useful excerpt.",
      }],
    });
    vi.mocked(executeCortexText).mockResolvedValue(null);

    const result = await CortexCore({
      userId: "learner-1",
      type: "learn",
      curriculum: { identity: { boardId: "cambridge", qualificationId: "AS", syllabusId: "9700", syllabusVersion: "2025-2027", subjectId: "biology" } } as any,
      payload: { topic: "Photosynthesis", research: true },
    });

    expect(result.response).toBe("A tutoring response.");
    expect(result.researchStatus).toBe("ai_unavailable");
    expect(result.sources).toHaveLength(1);
  });

  it("does not start online retrieval unless the learner explicitly requests it", async () => {
    const result = await CortexCore({
      userId: "learner-1",
      type: "learn",
      payload: { topic: "Photosynthesis" },
    });

    expect(result.researchStatus).toBeUndefined();
    expect(retrieveCortexKnowledge).not.toHaveBeenCalled();
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

  it("does not promote a client-supplied reference match into learner mastery", async () => {
    const result = await CortexCore({
      userId: "learner-1",
      accessToken: "learner-access-token",
      type: "practice",
      curriculum: { identity: { syllabusId: "cambridge-9700", subjectId: "biology" } } as any,
      payload: {
        attemptId: "attempt-1",
        questionId: "question-1",
        topic: "Photosynthesis",
        subjectName: "Biology",
        answer: "x = 2",
        correctAnswer: "x = 2",
      },
    });

    expect(result.response).toContain("matches the supplied reference answer");
    expect(result.nextAction).toBe("review_with_marking_guide");
    expect(updateMemory).toHaveBeenCalledWith("learner-1", { lastTopic: "Photosynthesis" });
    expect(updateMemory).not.toHaveBeenCalledWith("learner-1", expect.objectContaining({
      lastPracticeScore: expect.any(Number),
    }));
    expect(trackStudySession).not.toHaveBeenCalled();
    expect(trackExamResult).not.toHaveBeenCalled();
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

  it("does not record a client-supplied exam score as verified evidence", async () => {
    const result = await CortexCore({
      userId: "learner-1",
      type: "exam",
      payload: {
        subject: "Mathematics",
        score: 100,
        percentage: 100,
        completedAt: "2026-11-15T00:00:00.000Z",
      },
    });

    expect(result.nextAction).toBe("lock_learning_mode");
    expect(trackExamResult).not.toHaveBeenCalled();
    expect(updateMemory).not.toHaveBeenCalledWith("learner-1", expect.objectContaining({
      examScores: expect.any(Array),
      averageExamScore: expect.any(Number),
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
