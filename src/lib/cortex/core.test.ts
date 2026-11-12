import { beforeEach, describe, expect, it, vi } from "vitest";

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
    expect(updateMemory).not.toHaveBeenCalledWith("learner-1", {
      lastTopic: "Photosynthesis",
    });
  });
});
