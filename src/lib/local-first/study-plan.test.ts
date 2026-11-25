import { describe, expect, it, vi } from "vitest";
import { localFirstStore } from "@/lib/local-first/store";
import { clearLocalStudyPlan } from "./study-plan";
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

  it("tombstones the active account's stale plan in the local-first store", async () => {
    const id = studyPlanRecordId("user-a");
    const existing = {
      id,
      entity: "study_state" as const,
      entityId: id,
      userId: "user-a",
      payload: { plan: plan("user-a"), updatedAt: "2026-11-25T00:00:00.000Z" },
      updatedAt: 100,
      deviceId: "server",
      version: 1,
      syncVersion: 0,
    };
    const get = vi.spyOn(localFirstStore, "get").mockResolvedValue(existing);
    const hydrate = vi.spyOn(localFirstStore, "hydrate").mockResolvedValue();
    try {
      await clearLocalStudyPlan("user-a");
      expect(hydrate).toHaveBeenCalledWith(expect.objectContaining({
        id,
        userId: "user-a",
        version: 2,
        deletedAt: expect.any(Number),
      }));
    } finally {
      get.mockRestore();
      hydrate.mockRestore();
    }
  });
});
