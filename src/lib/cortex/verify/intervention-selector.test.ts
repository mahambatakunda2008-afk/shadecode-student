import { describe, expect, it } from "vitest";
import { resolveVerifyHelpLevel, selectVerifyIntervention } from "./intervention-selector";
import type { VerifyInterventionOutcome } from "./intervention-outcomes";

function outcome(
  interventionId: string,
  level: VerifyInterventionOutcome["interventionLevel"],
  scoreChange: number,
  overrides: Partial<VerifyInterventionOutcome> = {},
): VerifyInterventionOutcome {
  return {
    interventionId, subjectKey: "physics", topicId: "waves",
    curriculumTopicKey: "9702:4.2", interventionLevel: level,
    state: scoreChange >= 10 ? "improving" : scoreChange <= -10 ? "declining" : "stable",
    baselineAttempts: 2, transferAttempts: 2,
    baselineScore: 50, transferScore: 50 + scoreChange, scoreChange,
    observedAt: "2026-11-14T12:00:00.000Z",
    interpretation: "descriptive_not_causal",
    ...overrides,
  };
}

describe("selectVerifyIntervention", () => {
  it("selects a consistently stronger approach after repeated completed cycles", () => {
    const result = selectVerifyIntervention([
      outcome("vi_hint_000001", "hint", 5),
      outcome("vi_hint_000002", "hint", 8),
      outcome("vi_method_0001", "method", 24),
      outcome("vi_method_0002", "method", 27),
    ], { subjectKey: "physics", topicId: "waves" });
    expect(result?.recommendedLevel).toBe("method");
    expect(result?.advantage).toBe(19);
    expect(result?.confidence).toBe("exploratory");
    expect(result?.interpretation).toBe("descriptive_not_causal");
  });

  it("falls back when there are not two completed cycles per approach", () => {
    expect(selectVerifyIntervention([
      outcome("vi_hint_000001", "hint", 5),
      outcome("vi_method_0001", "method", 30),
      outcome("vi_method_0002", "method", 35),
    ], { subjectKey: "physics", topicId: "waves" })).toBeNull();
  });

  it("falls back when the difference is too small or tied", () => {
    expect(selectVerifyIntervention([
      outcome("vi_hint_000001", "hint", 15),
      outcome("vi_hint_000002", "hint", 18),
      outcome("vi_method_0001", "method", 20),
      outcome("vi_method_0002", "method", 22),
    ], { subjectKey: "physics", topicId: "waves" })).toBeNull();
  });

  it("isolates subject, topic and curriculum identity", () => {
    const rows = [
      outcome("vi_hint_000001", "hint", 2),
      outcome("vi_hint_000002", "hint", 4),
      outcome("vi_method_0001", "method", 30),
      outcome("vi_method_0002", "method", 35),
    ];
    expect(selectVerifyIntervention(rows, { subjectKey: "chemistry", topicId: "waves" })).toBeNull();
    expect(selectVerifyIntervention(rows, { subjectKey: "physics", topicId: "electricity" })).toBeNull();
    expect(selectVerifyIntervention(rows.map((row, i) => ({
      ...row, curriculumTopicKey: i % 2 ? "other-syllabus:4.2" : "9702:4.2",
    })), { subjectKey: "physics", topicId: "waves" })).toBeNull();
  });

  it("ignores incomplete, collecting and self-assessed-style evidence", () => {
    const rows = [
      outcome("vi_hint_000001", "hint", 1),
      outcome("vi_hint_000002", "hint", 2),
      outcome("vi_method_0001", "method", 30, { transferAttempts: 1 }),
      outcome("vi_method_0002", "method", 35, { state: "collecting_evidence" }),
    ];
    expect(selectVerifyIntervention(rows, { subjectKey: "physics", topicId: "waves" })).toBeNull();
  });
  it("does not count a duplicated intervention cycle twice", () => {
    const hint = outcome("vi_hint_000001", "hint", 4);
    const method = outcome("vi_method_0001", "method", 35);
    expect(selectVerifyIntervention([
      hint, hint,
      method,
      outcome("vi_method_0002", "method", 36),
    ], { subjectKey: "physics", topicId: "waves" })).toBeNull();
  });

  it("uses the evidence-backed level only when the learner has not chosen one", () => {
    expect(resolveVerifyHelpLevel({
      requestedLevel: "hint", explicit: false, recommendedLevel: "method",
    })).toBe("method");
    expect(resolveVerifyHelpLevel({
      requestedLevel: "solution", explicit: true, recommendedLevel: "hint",
    })).toBe("solution");
    expect(resolveVerifyHelpLevel({
      requestedLevel: "hint", explicit: false, recommendedLevel: null,
    })).toBe("hint");
  });

});
