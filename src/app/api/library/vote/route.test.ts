import { beforeEach, describe, expect, it, vi } from "vitest";

let currentUser: { id: string } | null = { id: "u1" };
let selectedSubjects: Array<{ id: string; name: string }> = [{ id: "math-id", name: "Mathematics" }];
let lessonSubject = "Geography";
const { upsert, resetLibraryCache } = vi.hoisted(() => ({
  upsert: vi.fn(),
  resetLibraryCache: vi.fn(),
}));

vi.mock("@/lib/rate-limit/limiter", () => ({ applyRateLimit: async () => null, generalApiLimiter: {} }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: currentUser }, error: null }) },
    from: (table: string) => {
      if (table === "lesson_library") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", subject: lessonSubject }, error: null }) }) }) };
      if (table === "lesson_votes") return { upsert };
      throw new Error(`Unexpected table ${table}`);
    },
  }),
}));
vi.mock("@/lib/subjects/resolveLearnerSubjects", () => ({
  resolveLearnerSubjects: async () => ({ subjects: selectedSubjects, onboardingComplete: true }),
  assertRequestedLearnerSubject: (subjects: Array<{ name: string }>, requested?: string | null) => {
    const normalized = (requested ?? "").trim().toLowerCase().replace(/\\s+/g, " ");
    if (!normalized || normalized === "all" || normalized === "general") return null;
    return subjects.find((subject) => subject.name.trim().toLowerCase().replace(/\\s+/g, " ") === normalized) ?? null;
  },
}));
vi.mock("@/lib/library/store", () => ({ resetLibraryCache }));

import { POST } from "./route";
const post = () => POST(new Request("http://localhost/api/library/vote", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", helpful: true }),
}) as never);

beforeEach(() => {
  currentUser = { id: "u1" };
  selectedSubjects = [{ id: "math-id", name: "Mathematics" }];
  lessonSubject = "Geography";
  upsert.mockReset();
  upsert.mockResolvedValue({ error: null });
  resetLibraryCache.mockReset();
});

describe("POST /api/library/vote subject access", () => {
  it("requires authentication", async () => {
    currentUser = null;
    expect((await post()).status).toBe(401);
    expect(upsert).not.toHaveBeenCalled();
  });
  it("denies voting on another subject's lesson without writing a vote", async () => {
    const response = await post();
    expect(response.status).toBe(403);
    expect(upsert).not.toHaveBeenCalled();
    expect(resetLibraryCache).not.toHaveBeenCalled();
  });
  it("fails closed when the learner has no selected subjects", async () => {
    selectedSubjects = [];
    expect((await post()).status).toBe(409);
    expect(upsert).not.toHaveBeenCalled();
  });
  it("allows a vote for an eligible subject", async () => {
    lessonSubject = "Mathematics";
    expect((await post()).status).toBe(200);
    expect(upsert).toHaveBeenCalledWith({ user_id: "u1", lesson_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", helpful: true }, { onConflict: "user_id,lesson_id" });
  });
});
