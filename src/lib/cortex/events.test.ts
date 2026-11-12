import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient }));

import { recordVerifiedPracticeAttempt } from "./events";

describe("verified Cortex practice events", () => {
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-test-key");
    rpc.mockResolvedValue({ data: { id: "event-1" }, error: null });
    createClient.mockReturnValue({ rpc });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const validInput = {
    userId: "learner-1",
    accessToken: "learner-access-token",
    subjectId: "biology",
    score: 100,
    syllabusId: "cambridge-9700",
    payload: {
      attemptId: "attempt-1",
      questionId: "question-1",
      subjectId: "untrusted-subject",
      topicId: "photosynthesis",
      answer: "student's submitted answer",
      correctAnswer: "reference answer",
    },
  };

  it("writes a minimal, syllabus-scoped event through the authenticated RPC", async () => {
    const result = await recordVerifiedPracticeAttempt(validInput);

    expect(result).toEqual({ recorded: true });
    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "public-test-key",
      {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: "Bearer learner-access-token" } },
      },
    );
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      "insert_canonical_cortex_event",
      expect.objectContaining({ p_user_id: "learner-1" }),
    );

    const event = rpc.mock.calls[0][1].p_event;
    expect(event).toMatchObject({
      kind: "question_attempted",
      source: "cortex-practice",
      userId: "learner-1",
      attemptId: "attempt-1",
      entityId: "question-1",
      subjectId: "biology",
      topicId: "photosynthesis",
      syllabusId: "cambridge-9700",
      metadata: {
        correct: true,
        score: 100,
        gradingMethod: "exact_reference_match",
        syllabusId: "cambridge-9700",
      },
    });
    expect(event.eventId).toMatch(/^cortex_practice_[a-f0-9]{64}$/);
    expect(event).not.toHaveProperty("answer");
    expect(event).not.toHaveProperty("correctAnswer");
    expect(JSON.stringify(event)).not.toContain("student's submitted answer");
    expect(JSON.stringify(event)).not.toContain("reference answer");
  });

  it("does not turn an ungraded answer into an incorrect or correct event", async () => {
    const result = await recordVerifiedPracticeAttempt({ ...validInput, score: null });

    expect(result).toEqual({ recorded: false, reason: "ungraded" });
    expect(createClient).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("refuses to create unscoped evidence without a verified syllabus", async () => {
    const result = await recordVerifiedPracticeAttempt({ ...validInput, syllabusId: null });

    expect(result).toEqual({ recorded: false, reason: "missing_learning_context" });
    expect(createClient).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("surfaces RPC failures to the caller so they can be logged", async () => {
    rpc.mockResolvedValue({ data: null, error: new Error("RPC unavailable") });

    await expect(recordVerifiedPracticeAttempt(validInput)).rejects.toThrow("RPC unavailable");
  });
});
