import { describe, expect, it } from "vitest";
import { generateTutoringResponse } from "./tutor";
import type { CortexStudentContext } from "@/lib/cortex/student-context";
import { deriveLearnerTopicState } from "@/lib/intelligence/learnerTopicState";

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
    lastTopic: "chain-rule",
    lastPracticeScore: 100,
    lastPracticeTopic: "chain-rule",
    lastPracticeSubject: "Mathematics",
    lastPracticeSyllabusId: "cambridge-9702",
  },
  curriculumObjectives: {
    state: "insufficient_evidence",
    source: "learner_curriculum_objective_progress",
    curriculumVersionId: null,
    evidenceCount: 0,
    items: [],
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
      learnerState: deriveLearnerTopicState({ attempts: 4, masteryScore: 61, errorRate: 50, recentImprovement: 5, uncertainty: 35 }),
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
  interventionOutcomes: {
    state: "insufficient_evidence",
    source: "cortex_events",
    items: [],
    interpretation: "descriptive_not_causal",
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


  it("uses verified syllabus objective progress as course-level learning context", async () => {
    const objectiveContext: CortexStudentContext = {
      ...context,
      curriculumObjectives: {
        state: "available",
        source: "learner_curriculum_objective_progress",
        curriculumVersionId: "verified-version",
        evidenceCount: 6,
        items: [
          { objectiveKey: "1", status: "mastered", masteryScore: 92, attempts: 3, completedLessons: 1, lastSeenAt: "2026-11-12T10:00:00.000Z", masteredAt: "2026-11-12T10:00:00.000Z", evidenceState: "available" },
          { objectiveKey: "2", status: "practicing", masteryScore: 61, attempts: 2, completedLessons: 0, lastSeenAt: "2026-11-12T10:00:00.000Z", masteredAt: null, evidenceState: "available" },
          { objectiveKey: "3", status: "learning", masteryScore: null, attempts: 0, completedLessons: 1, lastSeenAt: "2026-11-12T10:00:00.000Z", masteredAt: null, evidenceState: "available" },
        ],
      },
    };
    const response = await generateTutoringResponse("chain-rule", {
      studentContext: objectiveContext,
      subjectName: "Mathematics",
    });

    expect(response).toContain("evidence for 3 curriculum objectives");
    expect(response).toContain("1 marked mastered");
    expect(response).toContain("1 being practised");
    expect(response).toContain("1 being learned");
  });

  it("uses repeated-error and retrieval history to shape the next explanation", async () => {
    const eventContext: CortexStudentContext = {
      ...context,
      mistakes: {
        state: "available",
        source: "cortex_events",
        inspectedEventCount: 4,
        repeatedTopicErrors: [{
          subjectKey: "Mathematics",
          topicId: "chain-rule",
          incorrectResponses: 3,
          distinctAttempts: 2,
          lastObservedAt: "2026-11-12T10:00:00.000Z",
          evidenceState: "repeated_topic_errors",
        }],
        recurringMistakes: [{
          subjectKey: "Mathematics",
          topicId: "chain-rule",
          mistakeId: "omitted-inner-derivative",
          incorrectResponses: 2,
          distinctAttempts: 2,
          lastObservedAt: "2026-11-12T10:00:00.000Z",
          evidenceState: "recurring_mistake",
        }],
      },
      spacedRetrieval: {
        state: "available",
        source: "cortex_events",
        inspectedEventCount: 3,
        topics: [{
          subjectKey: "Mathematics",
          topicId: "chain-rule",
          distinctAttempts: 3,
          observedSpanDays: 5,
          intervalsDays: [2, 3],
          medianIntervalDays: 2.5,
          lastRetrievedAt: "2026-11-12T10:00:00.000Z",
          evidenceState: "observed_spacing",
          interpretation: "descriptive_only",
        }],
        interpretation: "descriptive_only",
      },
    };

    const response = await generateTutoringResponse("chain-rule", {
      studentContext: eventContext,
      subjectName: "Mathematics",
      curriculum: { identity: { syllabusId: "cambridge-9702" }, knowledge: { items: [] }, required: [], assessment: [] } as any,
    });

    expect(response).toContain("3 incorrect responses across 2 separate attempts");
    expect(response).toContain("A diagnosed error pattern has recurred across 2 separate attempts");
    expect(response).toContain("3 separate attempts over 5 days");
    expect(response).toContain("not a guarantee of mastery");
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
    expect(response).not.toContain("latest recorded practice score");
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
    expect(response).not.toContain("latest recorded practice score");
  });

  it("does not invent continuity when evidence is absent", async () => {
    const response = await generateTutoringResponse("chain-rule", {
      subjectName: "Mathematics",
    });

    expect(response).not.toContain("recorded learning attempts");
  });
});
