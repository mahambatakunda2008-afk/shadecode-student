import { describe, expect, it } from "vitest";
import { deriveVerifyInterventionOutcomes } from "./intervention-outcomes";

const event = (input: {
  attemptId: string; score: number; at: string; interventionId?: string;
  freshTransfer?: boolean; topicKey?: string; selfAssessment?: boolean;
}) => ({
  type: "question_attempted",
  created_at: input.at,
  data: {
    attemptId: input.attemptId,
    subjectId: "Physics",
    topicId: "Waves",
    ...(input.topicKey === undefined ? { curriculumTopicKey: "physics-waves" } : { curriculumTopicKey: input.topicKey }),
    occurredAt: input.at,
    metadata: {
      evidenceScore: input.score,
      ...(input.interventionId ? {
        interventionId: input.interventionId,
        interventionLevel: "method",
        interventionToAttemptHours: Math.max(0, (Date.parse(input.at) - Date.parse("2026-11-14T10:00:00.000Z")) / 3_600_000),
        freshTransfer: input.freshTransfer ?? true,
      } : {}),
      ...(input.selfAssessment ? { selfAssessment: true } : {}),
    },
  },
});

describe("deriveVerifyInterventionOutcomes", () => {
  it("requires two distinct baseline and two fresh-transfer attempts before measuring change", () => {
    const rows = [
      event({ attemptId: "baseline-1", score: 40, at: "2026-11-14T08:00:00.000Z" }),
      event({ attemptId: "baseline-2", score: 50, at: "2026-11-14T09:00:00.000Z" }),
      event({ attemptId: "follow-1", score: 70, at: "2026-11-14T11:00:00.000Z", interventionId: "vi_abc123_1234567" }),
      event({ attemptId: "follow-2", score: 80, at: "2026-11-14T12:00:00.000Z", interventionId: "vi_abc123_1234567" }),
    ];
    expect(deriveVerifyInterventionOutcomes(rows)).toEqual([{
      interventionId: "vi_abc123_1234567",
      subjectKey: "Physics",
      topicId: "Waves",
      curriculumTopicKey: "physics-waves",
      interventionLevel: "method",
      state: "improving",
      baselineAttempts: 2,
      transferAttempts: 2,
      baselineScore: 45,
      transferScore: 75,
      scoreChange: 30,
      observedAt: "2026-11-14T12:00:00.000Z",
      interpretation: "descriptive_not_causal",
    }]);
  });

  it("ignores stale baseline attempts outside the 30-day comparison window", () => {
    const result = deriveVerifyInterventionOutcomes([
      event({ attemptId: "old-1", score: 10, at: "2026-09-01T08:00:00.000Z" }),
      event({ attemptId: "old-2", score: 10, at: "2026-09-02T08:00:00.000Z" }),
      event({ attemptId: "follow-1", score: 90, at: "2026-11-14T11:00:00.000Z", interventionId: "vi_abc123_1234567" }),
      event({ attemptId: "follow-2", score: 90, at: "2026-11-14T12:00:00.000Z", interventionId: "vi_abc123_1234567" }),
    ]);
    expect(result[0]).toMatchObject({
      state: "collecting_evidence", baselineAttempts: 0, transferAttempts: 2,
      baselineScore: null, transferScore: 90, scoreChange: null,
    });
  });

  it("keeps one follow-up in collecting state and does not claim improvement", () => {
    const result = deriveVerifyInterventionOutcomes([
      event({ attemptId: "baseline-1", score: 30, at: "2026-11-14T09:00:00.000Z" }),
      event({ attemptId: "baseline-2", score: 40, at: "2026-11-14T09:30:00.000Z" }),
      event({ attemptId: "follow-1", score: 100, at: "2026-11-14T11:00:00.000Z", interventionId: "vi_abc123_1234567" }),
    ]);
    expect(result[0]).toMatchObject({
      state: "collecting_evidence", baselineAttempts: 2, transferAttempts: 1,
      baselineScore: 35, transferScore: 100, scoreChange: null,
    });
  });

  it("does not use self-assessed or unverified-topic evidence", () => {
    const rows = [
      event({ attemptId: "baseline-1", score: 20, at: "2026-11-14T08:00:00.000Z" }),
      event({ attemptId: "baseline-2", score: 30, at: "2026-11-14T09:00:00.000Z" }),
      event({ attemptId: "follow-1", score: 90, at: "2026-11-14T11:00:00.000Z", interventionId: "vi_abc123_1234567" }),
      event({ attemptId: "follow-2", score: 90, at: "2026-11-14T12:00:00.000Z", interventionId: "vi_abc123_1234567", selfAssessment: true }),
    ];
    expect(deriveVerifyInterventionOutcomes(rows)[0].state).toBe("collecting_evidence");
    expect(deriveVerifyInterventionOutcomes(rows.map(row => ({
      ...row, data: { ...row.data, curriculumTopicKey: "" },
    })))).toEqual([]);
  });

  it("does not double-count duplicate questions within one attempt", () => {
    const rows = [
      event({ attemptId: "baseline-1", score: 30, at: "2026-11-14T08:00:00.000Z" }),
      event({ attemptId: "baseline-2", score: 30, at: "2026-11-14T09:00:00.000Z" }),
      event({ attemptId: "follow-1", score: 80, at: "2026-11-14T11:00:00.000Z", interventionId: "vi_abc123_1234567" }),
      event({ attemptId: "follow-1", score: 100, at: "2026-11-14T11:01:00.000Z", interventionId: "vi_abc123_1234567" }),
    ];
    const result = deriveVerifyInterventionOutcomes(rows)[0];
    expect(result.transferAttempts).toBe(1);
    expect(result.state).toBe("collecting_evidence");
    expect(result.transferScore).toBe(90);
  });

  it("keeps outcomes partitioned by verified curriculum topic identity", () => {
    const rows = [
      event({ attemptId: "baseline-1", score: 20, at: "2026-11-14T08:00:00.000Z" }),
      event({ attemptId: "baseline-2", score: 20, at: "2026-11-14T09:00:00.000Z" }),
      event({ attemptId: "follow-1", score: 90, at: "2026-11-14T11:00:00.000Z", interventionId: "vi_abc123_1234567" }),
      event({ attemptId: "follow-2", score: 90, at: "2026-11-14T12:00:00.000Z", interventionId: "vi_abc123_1234567", topicKey: "different-key" }),
    ];
    const result = deriveVerifyInterventionOutcomes(rows)[0];
    expect(result.transferAttempts).toBe(1);
    expect(result.state).toBe("collecting_evidence");
  });
});
