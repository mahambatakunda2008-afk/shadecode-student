import { describe, expect, it } from "vitest";
import type { StudyPlan } from "@/lib/studyPlan/types";
import { isStudyPlanOwnedBy, studyPlanRecordId } from "./study-plan";

const plan = (userId: string): StudyPlan => ({
  id: "plan-1",
  userId,
  goals: { targetGrade: "A", examDate: "2027-06-01", availableHoursPerWeek: 10, subjects: ["Mathematics"] },
  startDate: "2026-11-25",
  endDate: "2027-06-01",
  weeklySchedules: [],
  revisionBlocks: [],
  catchUpRecommendations: [],
  createdAt: "2026-11-25T00:00:00.000Z",
  updatedAt: "2026-11-25T00:00:00.000Z",
  isActive: true,
});

describe("local study plan cache contract", () => {
  it("uses an account-specific record identity", () => {
    expect(studyPlanRecordId("user-a")).not.toBe(studyPlanRecordId("user-b"));
  });

  it("accepts only plans owned by the active account", () => {
    expect(isStudyPlanOwnedBy(plan("user-a"), "user-a")).toBe(true);
    expect(isStudyPlanOwnedBy(plan("user-a"), "user-b")).toBe(false);
    expect(isStudyPlanOwnedBy(null, "user-a")).toBe(false);
  });
});
