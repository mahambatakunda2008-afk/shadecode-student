import { describe, expect, it } from "vitest";
import { buildLessonPlan } from "@/lib/cortex/lessonPlan";
import type { LearningIntentResult } from "@/lib/cortex/learningIntent";

const intent = (value: LearningIntentResult["intent"]): LearningIntentResult => ({
  intent: value,
  confidence: "high",
  reason: "test",
});

describe("buildLessonPlan", () => {
  it("gives AS/A Level a rigorous quantitative teaching style", () => {
    const plan = buildLessonPlan({ intent: intent("learn"), level: "AS Level", examBoard: "Cambridge", subject: "Physics" });
    expect(plan.levelStyle).toMatch(/rigorous definitions/i);
    expect(plan.levelStyle).toMatch(/units and conditions/i);
    expect(plan.sequence).toContain("formula");
    expect(plan.sequence).toContain("exam-application");
  });

  it("gives Primary a concrete, small-step teaching style", () => {
    const plan = buildLessonPlan({ intent: intent("learn"), level: "Primary", subject: "Science" });
    expect(plan.levelStyle).toMatch(/concrete everyday contexts/i);
    expect(plan.levelStyle).toMatch(/tiny steps/i);
  });

  it("puts misconception repair before forward teaching for remediation", () => {
    const plan = buildLessonPlan({ intent: intent("remediate"), level: "Secondary", subject: "Mathematics" });
    expect(plan.sequence.indexOf("misconception")).toBeLessThan(plan.sequence.indexOf("concept"));
    expect(plan.contract.join(" ")).toMatch(/repair prerequisite gaps/i);
  });

  it("uses progressive practice for practice intent", () => {
    const plan = buildLessonPlan({ intent: intent("practice"), level: "IGCSE", subject: "Physics" });
    expect(plan.sequence).toContain("practice");
    expect(plan.contract.join(" ")).toMatch(/Progress from accessible to challenging/i);
  });

  it("starts from prerequisites for from-scratch learning", () => {
    const plan = buildLessonPlan({ intent: intent("from-scratch"), level: "AS Level", subject: "Physics" });
    expect(plan.sequence[1]).toBe("prerequisite");
    expect(plan.contract.join(" ")).toMatch(/prerequisite ladder/i);
  });

  it("preserves the learner as the source of truth", () => {
    const plan = buildLessonPlan({ intent: intent("guided-solve"), level: "University", subject: "Computer Science" });
    expect(plan.contract.join(" ")).toMatch(/exact request and subject as the source of truth/i);
  });
});
