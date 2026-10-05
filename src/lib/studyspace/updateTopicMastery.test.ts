import { describe, expect, it, vi } from "vitest";
import type { LearningEvidence } from "./evidence";

const { maybeSingle, update, insert } = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
}));

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
      update: (payload: unknown) => {
        update(payload);
        return { eq: vi.fn().mockResolvedValue({ error: null }) };
      },
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
      last_score: 84,
      attempts: 1,
      trend: 0,
    }));
  });

  it("blends a repeat assessment with the previous mastery score", async () => {
    maybeSingle.mockResolvedValue({ data: { id: "mastery-1", mastery_score: 70, attempts: 2 }, error: null });
    update.mockResolvedValue(undefined);

    await updateTopicMasteryFromEvidence("user-1", evidence);

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      mastery_score: 74,
      attempts: 3,
      trend: 4,
    }));
    expect(typeof update.mock.calls[0][0].trend).toBe("number");
  });

  it("normalises cosmetic topic variants to one key", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    insert.mockResolvedValue({ error: null });
    insert.mockClear();

    await updateTopicMasteryFromEvidence("user-1", { ...evidence, topic: "  Oscillations. " });

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ topic: "Oscillations" }));
  });
});
