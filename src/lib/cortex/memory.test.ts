import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({ createClient }));

import { getMemory, updateMemory } from "./memory";

const row = {
  level: 2,
  current_streak: 3,
  frequently_studied_subjects: ["Biology"],
  weak_subjects: ["Physics"],
  weak_topics: ["Photosynthesis"],
  strong_subjects: ["Mathematics"],
  last_topic: "Cell structure",
  last_practice_score: 75,
  last_practice_topic: "Photosynthesis",
  last_feedback: "More worked examples, please.",
  average_exam_score: 82,
};

function configureSupabase() {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    upsert: vi.fn(),
    single: vi.fn(),
  };

  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.upsert.mockReturnValue(builder);
  builder.single.mockResolvedValue({ data: row, error: null });

  createClient.mockReturnValue({
    from: vi.fn().mockReturnValue(builder),
  });

  return builder;
}

describe("persistent Cortex memory mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps subject weaknesses, topic weaknesses and practice scores distinct", async () => {
    configureSupabase();

    const memory = await getMemory("learner-1");

    expect(memory.weakSubjects).toEqual(["Physics"]);
    expect(memory.weakTopics).toEqual(["Photosynthesis"]);
    expect(memory.lastPracticeScore).toBe(75);
    expect(memory.lastPracticeTopic).toBe("Photosynthesis");
    expect(memory.averageExamScore).toBe(82);
    expect(memory.lastTopic).toBe("Cell structure");
    expect(memory.feedback).toBe("More worked examples, please.");
  });

  it("writes practice fields without overwriting formal exam averages", async () => {
    const builder = configureSupabase();

    await updateMemory("learner-1", {
      weakTopics: ["Photosynthesis"],
      weakSubjects: ["Physics"],
      lastPracticeScore: 75,
      lastPracticeTopic: "Photosynthesis",
    });

    expect(builder.upsert).toHaveBeenCalledWith(
      {
        user_id: "learner-1",
        weak_topics: ["Photosynthesis"],
        weak_subjects: ["Physics"],
        last_practice_score: 75,
        last_practice_topic: "Photosynthesis",
      },
      { onConflict: "user_id" },
    );
  });
});
