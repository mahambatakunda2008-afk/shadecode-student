import { describe, expect, it, vi } from "vitest";
import type { LearningEvidence } from "./evidence";

const { selectChain, maybeSingle, updateChain, update, insert } = vi.hoisted(() => ({
  selectChain: { eq: vi.fn() },
  maybeSingle: vi.fn(),
  updateChain: { eq: vi.fn() },
  update: vi.fn(),
  insert: vi.fn(),
}));

selectChain.eq.mockReturnValueOnce(selectChain).mockReturnValueOnce(selectChain);
selectChain.eq.mockReturnValueOnce({ maybeSingle });
updateChain.eq.mockReturnValue(update);

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle }),
          }),
        }),
      }),
      update: () => ({ eq: update }),
      insert,
    }),
  }),
}));

import { updateTopicMasteryFromEvidence } from "./updateTopicMastery";

const evidence: LearningEvidence = {
  id: "evidence-1",
  workId: "work-1",
  source: "assessment",
  subject: "Physics",
  topic: "Oscillations",
  outcome: "marked",
  score: 42,
  percentage: 84,
  weakAreas: ["Damping"],
  strongAreas: ["Period"],
  timeSpentMs: 120000,
  createdAt: "2026-08-22T08:03:00.000Z",
};

describe("updateTopicMasteryFromEvidence", () => {
  it("inserts mastery for a first assessment", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    insert.mockResolvedValue({ error: null });

    await updateTopicMasteryFromEvidence("user-1", evidence);

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "user-1",
      subject: "Physics",
      topic: "Oscillations",
      mastery_score: 84,
      trend: "stable",
    }));
  });

  it("blends a repeat assessment with the previous mastery score", async () => {
    maybeSingle.mockResolvedValue({ data: { id: "mastery-1", mastery_score: 70 }, error: null });
    update.mockResolvedValue({ error: null });

    await updateTopicMasteryFromEvidence("user-1", evidence);

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      mastery_score: 78,
      trend: "improving",
    }));
  });
});
