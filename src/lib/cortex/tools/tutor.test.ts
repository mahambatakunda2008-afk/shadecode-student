import { describe, expect, it } from "vitest";
import { generateTutoringResponse } from "./tutor";
import type { CortexStudentContext } from "@/lib/cortex/student-context";

const context: CortexStudentContext = {
  schemaVersion: 1,
  generatedAt: "2026-11-12T12:00:00.000Z",
  profile: {
    state: "available",
    source: "profiles+cortex_memory",
    observedAt: "2026-11-12T11:00:00.000Z",
    level: 3,
    streak: 2,
    subjects: ["Mathematics"],
    studyLevel: "A Level",
    educationStage: "secondary",
    curriculumDeclaration: {
      board: "Cambridge",
      qualification: "A Level",
      syllabusCode: "9702",
      syllabusYear: "2025-2027",
      verified: false,
    },
    frequentlyStudiedSubjects: ["Mathematics"],
    strongSubjects: [],
    weakSubjects: [],
    totalStudySessions: 8,
    totalLessonsCompleted: 12,
    averageExamScore: null,
    lastTopic: null,
    lastPracticeScore: null,
    lastPracticeTopic: null,
  },
  topics: {
    state: "available",
    source: "topic_mastery",
    evidenceCount: 4,
    items: [{
      topicId: "chain-rule",
      subjectKey: "Mathematics",
      syllabusId: "cambridge-9702",
      curriculumTopicKey: "1.1",
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
  mistakes: {
    state: "insufficient_evidence",
    source: "cortex_events",
    inspectedEventCount: 0,
    repeatedTopicErrors: [],
    recurringMistakes: [],
  },
  spacedRetrieval: {
    state: "insufficient_evidence",
    source: "cortex_events",
    inspectedEventCount: 0,
    topics: [],
    interpretation: "descriptive_only",
  },
  reviewActivity: {
    state: "insufficient_evidence",
    source: "cortex_events",
    sessions: [],
  },
  reviewSuggestions: {
    state: "insufficient_evidence",
    source: "cortex_events",
    items: [],
    interpretation: "evidence_backed_no_due_dates",
  },
};

describe("Cortex tutor learner continuity", () => {
  it("uses saved topic evidence when topic and subject both match", async () => {
    const response = await generateTutoringResponse("chain-rule", {
      studentContext: context,
      subjectName: "Mathematics",
      curriculum: {
        identity: {
          boardId: "cambridge",
          qualificationId: "alevel",
          level: "A Level",
          syllabusId: "cambridge-9702",
          syllabusVersion: "2025-2027",
          subjectId: "mathematics",
        },
        objectives: [],
        knowledge: {
          identity: {
            boardId: "cambridge",
            qualificationId: "alevel",
            level: "A Level",
            syllabusId: "cambridge-9702",
            syllabusVersion: "2025-2027",
            subjectId: "mathematics",
          },
          items: [],
          verifiedOnly: true,
        },
        required: [],
        supporting: [],
        assessment: [],
        practical: [],
        terminology: [],
        provenanceWarnings: [],
      },
    });

    expect(response).toContain("4 recorded learning attempts");
    expect(response).toContain("rather than assume this is your first encounter");
    expect(response).toContain("latest recorded practice score");
    expect(response).toContain("100%");
    expect(response).toContain("not proof of mastery");
  });

  it("does not reuse topic evidence from a different active syllabus", async () => {
    const response = await generateTutoringResponse("chain-rule", {
      studentContext: context,
      subjectName: "Mathematics",
      curriculum: {
        identity: {
          boardId: "cambridge",
          qualificationId: "alevel",
          level: "A Level",
          syllabusId: "cambridge-9700",
          syllabusVersion: "2025-2027",
          subjectId: "biology",
        },
        objectives: [],
        knowledge: {
          identity: {
            boardId: "cambridge",
            qualificationId: "alevel",
            level: "A Level",
            syllabusId: "cambridge-9700",
            syllabusVersion: "2025-2027",
            subjectId: "biology",
          },
          items: [],
          verifiedOnly: true,
        },
        required: [],
        supporting: [],
        assessment: [],
        practical: [],
        terminology: [],
        provenanceWarnings: [],
      },
    });

    expect(response).not.toContain("recorded learning attempts");
  });

  it("does not leak evidence across subjects within the same syllabus", async () => {
    const response = await generateTutoringResponse("chain-rule", {
      studentContext: context,
      subjectName: "Physics",
      curriculum: {
        identity: {
          boardId: "cambridge",
          qualificationId: "alevel",
          level: "A Level",
          syllabusId: "cambridge-9702",
          syllabusVersion: "2025-2027",
          subjectId: "physics",
        },
        objectives: [],
        knowledge: {
          identity: {
            boardId: "cambridge",
            qualificationId: "alevel",
            level: "A Level",
            syllabusId: "cambridge-9702",
            syllabusVersion: "2025-2027",
            subjectId: "physics",
          },
          items: [],
          verifiedOnly: true,
        },
        required: [],
        supporting: [],
        assessment: [],
        practical: [],
        terminology: [],
        provenanceWarnings: [],
      },
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
