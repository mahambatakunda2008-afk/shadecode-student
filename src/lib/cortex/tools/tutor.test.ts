import { describe, expect, it } from "vitest";
import { generateTutoringResponse } from "./tutor";
import type { CortexStudentContext } from "@/lib/cortex/student-context";

const context: CortexStudentContext = {
  schemaVersion: 1,
  generatedAt: "2026-11-12T12:00:00.000Z",
  profile: {
    state: "available",
    source: "cortex_memory",
    observedAt: "2026-11-12T11:00:00.000Z",
    level: 3,
    streak: 2,
    frequentlyStudiedSubjects: ["Mathematics"],
    strongSubjects: [],
    weakSubjects: [],
    totalStudySessions: 8,
    totalLessonsCompleted: 12,
    averageExamScore: null,
  },
  topics: {
    state: "available",
    source: "topic_mastery",
    evidenceCount: 4,
    items: [{
      topicId: "chain-rule",
      subjectKey: "Mathematics",
      masteryScore: 61,
      attempts: 4,
      retention: 55,
      confidence: 60,
      stability: 48,
      errorRate: 50,
      uncertainty: 35,
      lastObservedAt: "2026-11-11T15:00:00.000Z",
      evidenceState: "available",
      source: "topic_mastery",
    }],
  },
};

describe("Cortex tutor learner continuity", () => {
  it("uses saved topic evidence when topic and subject both match", async () => {
    const response = await generateTutoringResponse("chain-rule", {
      studentContext: context,
      subjectName: "Mathematics",
    });

    expect(response).toContain("4 recorded learning attempts");
    expect(response).toContain("rather than assume this is your first encounter");
  });

  it("does not leak evidence across subjects", async () => {
    const response = await generateTutoringResponse("chain-rule", {
      studentContext: context,
      subjectName: "Physics",
    });

    expect(response).not.toContain("recorded learning attempts");
  });

  it("does not invent continuity when evidence is absent", async () => {
    const response = await generateTutoringResponse("chain-rule", {
      subjectName: "Mathematics",
    });

    expect(response).not.toContain("recorded learning attempts");
  });
});
