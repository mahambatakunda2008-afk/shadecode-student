import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkObject } from "./types";

const { saveWorkObject, emitCortexEvent } = vi.hoisted(() => ({
  saveWorkObject: vi.fn().mockResolvedValue(undefined),
  emitCortexEvent: vi.fn(),
}));

vi.mock("./store", () => ({ saveWorkObject }));
vi.mock("@/lib/cortex/events/emit", () => ({ emitCortexEvent }));

import { submitStudySpaceEvidence } from "./submitEvidence";

const work: WorkObject = {
  id: "work-42",
  mode: "workmate",
  status: "marked",
  subject: "Physics",
  topic: "Oscillations",
  assessment: {
    score: 42,
    maxScore: 50,
    percentage: 84,
    weakAreas: ["Damping"],
    strongAreas: ["Period"],
  },
  timeSpentMs: 180000,
  createdAt: "2026-08-22T08:00:00.000Z",
  updatedAt: "2026-08-22T08:03:00.000Z",
};

describe("submitStudySpaceEvidence", () => {
  beforeEach(() => {
    saveWorkObject.mockClear();
    emitCortexEvent.mockClear();
  });

  it("persists the work and emits one stable learning event", async () => {
    const evidence = await submitStudySpaceEvidence(work, "user-1");

    expect(saveWorkObject).toHaveBeenCalledWith(work);
    expect(emitCortexEvent).toHaveBeenCalledTimes(1);
    expect(emitCortexEvent).toHaveBeenCalledWith(expect.objectContaining({
      id: `studyspace:${work.id}:${work.updatedAt}`,
      userId: "user-1",
      type: "studyspace.assessment.completed",
      source: "studyspace",
      data: expect.objectContaining({
        outcome: "marked",
        percentage: 84,
        weakAreas: JSON.stringify(["Damping"]),
        strongAreas: JSON.stringify(["Period"]),
      }),
    }));
    expect(evidence.workId).toBe(work.id);
  });
});
