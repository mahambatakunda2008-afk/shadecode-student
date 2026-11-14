import { describe, expect, it } from "vitest";
import { buildSharedVerifyLearnerContext } from "./shared-learner-context";
import type { CortexStudentContext } from "@/lib/cortex/student-context";

const base = {
  schemaVersion: 1,
  generatedAt: "2026-11-14T12:00:00.000Z",
  profile: { state: "available" },
  curriculumObjectives: {
    state: "available", source: "learner_curriculum_objective_progress", curriculumVersionId: "v1", evidenceCount: 2,
    items: [{ objectiveKey: "2.1", status: "learning", masteryScore: 42, attempts: 2, completedLessons: 0, lastSeenAt: null, masteredAt: null, evidenceState: "available" }],
  },
  topics: {
    state: "available", source: "topic_mastery", evidenceCount: 3,
    items: [
      { topicId: "Waves", subjectKey: "Physics", syllabusId: "s1", curriculumTopicKey: "waves", masteryScore: 45, attempts: 3, retention: null, confidence: 60, stability: null, errorRate: 55, uncertainty: 40, lastObservedAt: "2026-11-13T12:00:00.000Z", evidenceState: "available", learnerState: { mastery: "struggling", trajectory: "declining", evidenceStrength: "moderate", evidenceCount: 3, confidence: 60, rationale: [] }, source: "topic_mastery" },
      { topicId: "Algebra", subjectKey: "Mathematics", syllabusId: "s2", curriculumTopicKey: "algebra", masteryScore: 30, attempts: 2, retention: null, confidence: 50, stability: null, errorRate: 70, uncertainty: 50, lastObservedAt: null, evidenceState: "available", learnerState: { mastery: "struggling", trajectory: "unknown", evidenceStrength: "limited", evidenceCount: 2, confidence: 50, rationale: [] }, source: "topic_mastery" },
    ],
  },
  mistakes: {
    state: "available", source: "cortex_events", inspectedEventCount: 2,
    repeatedTopicErrors: [{ subjectKey: "Physics", topicId: "Waves", incorrectResponses: 3, distinctAttempts: 2, lastObservedAt: null, evidenceState: "repeated_topic_errors" }],
    recurringMistakes: [{ subjectKey: "Physics", topicId: "Waves", mistakeId: "unit-conversion", incorrectResponses: 2, distinctAttempts: 2, lastObservedAt: null, evidenceState: "recurring_mistake" }],
  },
  spacedRetrieval: { state: "insufficient_evidence", source: "cortex_events", inspectedEventCount: 0, topics: [], interpretation: "descriptive_only" },
  reviewActivity: { state: "insufficient_evidence", source: "cortex_events", sessions: [] },
  reviewSuggestions: {
    state: "available", source: "cortex_events",
    items: [{ subjectKey: "Physics", topicId: "Waves", priority: "high", reason: "repeated_errors", distinctAttempts: 2, incorrectResponses: 3, lastObservedAt: null, observedMedianIntervalDays: null, evidenceState: "evidence_backed_suggestion" }],
    interpretation: "evidence_backed_no_due_dates",
  },
  interventionOutcomes: {
    state: "available", source: "cortex_events",
    items: [{ interventionId: "vi_abc123_1234567", subjectKey: "Physics", topicId: "Waves", curriculumTopicKey: "physics-waves", interventionLevel: "method", state: "improving", baselineAttempts: 2, transferAttempts: 2, baselineScore: 45, transferScore: 75, scoreChange: 30, observedAt: "2026-11-14T12:00:00.000Z", interpretation: "descriptive_not_causal" }],
    interpretation: "descriptive_not_causal",
  },
} as unknown as CortexStudentContext;

describe("shared Verify learner context", () => {
  it("uses canonical topic and repeated-error evidence for the active subject", () => {
    const context = buildSharedVerifyLearnerContext(base, "Physics");
    expect(context).toContain("Waves");
    expect(context).toContain("unit-conversion");
    expect(context).toContain("intervention follow-up for Waves");
    expect(context).toContain("not proof the intervention caused the change");
    expect(context).not.toContain("Curriculum objective 2.1");
    expect(context).not.toContain("Algebra");
    expect(context).not.toContain("Curriculum objective");
  });

  it("does not leak evidence from another subject", () => {
    const context = buildSharedVerifyLearnerContext(base, "Mathematics");
    expect(context).toContain("Algebra");
    expect(context).not.toContain("Waves");
    expect(context).not.toContain("unit-conversion");
    expect(context).not.toContain("intervention follow-up");
  });

  it("bounds the prompt context", () => {
    expect(buildSharedVerifyLearnerContext(base, "Physics", 120).length).toBeLessThanOrEqual(120);
  });
});
