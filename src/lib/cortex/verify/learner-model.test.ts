import { describe, expect, it } from "vitest";
import { EMPTY_VERIFY_LEARNER_MODEL, buildVerifyLearnerContext, learnFromVerifyResult, recommendVerifyPractice } from "./learner-model";

describe("Cortex Verify learner model", () => {
  it("updates a topic mastery estimate from repeated marked evidence", () => {
    const first = learnFromVerifyResult(EMPTY_VERIFY_LEARNER_MODEL, {
      subject: "Mathematics", topic: "Coordinate geometry", score: 40, occurredAt: "2026-11-14T10:00:00.000Z",
    });
    const second = learnFromVerifyResult(first, {
      subject: "Mathematics", topic: "Coordinate geometry", score: 80, occurredAt: "2026-11-14T11:00:00.000Z",
    });
    expect(first.topics[0].masteryEstimate).toBe(40);
    expect(second.topics[0].masteryEstimate).toBe(52);
    expect(second.topics[0].attempts).toBe(2);
  });

  it("tracks recurring error signals without storing the student's raw answer", () => {
    const next = learnFromVerifyResult(EMPTY_VERIFY_LEARNER_MODEL, {
      subject: "Mathematics", topic: "Algebra", score: 55,
      misconceptionTags: ["Sign error", "Sign error", "Incorrect substitution"],
    });
    expect(next.topics[0].misconceptionCounts["sign error"]).toBe(2);
    expect(next.topics[0].misconceptionCounts["incorrect substitution"]).toBe(1);
    expect(JSON.stringify(next)).not.toContain("studentAnswer");
  });

  it("keeps subjects and topics separate", () => {
    const one = learnFromVerifyResult(EMPTY_VERIFY_LEARNER_MODEL, { subject: "Physics", topic: "Waves", score: 70 });
    const two = learnFromVerifyResult(one, { subject: "Mathematics", topic: "Waves", score: 90 });
    expect(two.topics).toHaveLength(2);
  });

  it("does not update mastery without scored evidence", () => {
    expect(learnFromVerifyResult(EMPTY_VERIFY_LEARNER_MODEL, { subject: "Physics" })).toBe(EMPTY_VERIFY_LEARNER_MODEL);
  });

  it("produces actionable adaptation context", () => {
    const model = learnFromVerifyResult(EMPTY_VERIFY_LEARNER_MODEL, {
      subject: "Mathematics", topic: "Algebra", score: 35, misconceptionTags: ["Sign error"],
    });
    expect(buildVerifyLearnerContext(model)).toContain("recurring error signals");
    expect(buildVerifyLearnerContext(model)).toContain("fresh question");
  });
  it("prioritizes weak topics and applies spaced review to stronger topics", () => {
    const now = "2026-11-14T12:00:00.000Z";
    let model = learnFromVerifyResult(EMPTY_VERIFY_LEARNER_MODEL, {
      subject: "Mathematics", topic: "Algebra", score: 35,
      misconceptionTags: ["Sign error", "Sign error"],
      occurredAt: "2026-11-13T12:00:00.000Z",
    });
    model = learnFromVerifyResult(model, {
      subject: "Mathematics", topic: "Trigonometry", score: 92,
      occurredAt: "2026-10-20T12:00:00.000Z",
    });
    const ranked = recommendVerifyPractice(model, { subject: "Mathematics", now });
    expect(ranked[0].topic).toBe("Algebra");
    expect(ranked[0].action).toBe("reteach");
    expect(ranked.find(item => item.topic === "Trigonometry")?.action).toBe("spaced-retrieval");
  });

  it("includes actionable practice priorities in the context sent to Cortex", () => {
    const model = learnFromVerifyResult(EMPTY_VERIFY_LEARNER_MODEL, {
      subject: "Physics", topic: "Waves", score: 48,
      occurredAt: "2026-11-10T12:00:00.000Z",
    });
    const context = buildVerifyLearnerContext(model, { subject: "Physics", now: "2026-11-14T12:00:00.000Z" });
    expect(context).toContain("NEXT PRACTICE PRIORITIES");
    expect(context).toContain("Physics / Waves");
    expect(context).toContain("reteach");
  });

  it("does not leak another subject into a subject-filtered practice context", () => {
    let model = learnFromVerifyResult(EMPTY_VERIFY_LEARNER_MODEL, { subject: "Physics", topic: "Waves", score: 40 });
    model = learnFromVerifyResult(model, { subject: "Mathematics", topic: "Algebra", score: 30 });
    const context = buildVerifyLearnerContext(model, { subject: "Physics", now: "2026-11-14T12:00:00.000Z" });
    expect(context).toContain("Physics / Waves");
    expect(context).not.toContain("Mathematics / Algebra");
  });

});
