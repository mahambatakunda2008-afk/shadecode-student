import { beforeEach, describe, expect, it, vi } from "vitest";

let currentUser: { id: string } | null = { id: "u1" };
let selectedSubjects: Array<{ id: string; name: string }> = [{ id: "math-id", name: "Mathematics" }];
let lessonSubject = "Geography";
let lessonData: Record<string, unknown> | null = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  title: "Coastlines",
  topic: "Coastal processes",
  subject: "Geography",
  difficulty: "AS",
  blocks: [],
  helpful_up: 0,
  helpful_down: 0,
};
const lessonLookup = vi.fn();
const voteLookup = vi.fn();

vi.mock("@/lib/rate-limit/limiter", () => ({ applyRateLimit: async () => null, generalApiLimiter: {} }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: currentUser }, error: null }) },
    from: (table: string) => {
      if (table === "lesson_library") return {
        select: () => ({ eq: () => ({ maybeSingle: async () => {
          lessonLookup();
          return { data: lessonData ? { ...lessonData, subject: lessonSubject } : null, error: null };
        } }) }),
      };
      if (table === "lesson_votes") return {
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => {
          voteLookup();
          return { data: null, error: null };
        } }) }) }),
      };
      throw new Error(`Unexpected table ${table}`);
    },
  }),
}));
vi.mock("@/lib/subjects/resolveLearnerSubjects", () => ({
  resolveLearnerSubjects: async () => ({ subjects: selectedSubjects, onboardingComplete: true }),
  assertRequestedLearnerSubject: (subjects: Array<{ name: string }>, requested?: string | null) => {
    const normalized = (requested ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    if (!normalized || normalized === "all" || normalized === "general") return null;
    return subjects.find((subject) => subject.name.trim().toLowerCase().replace(/\s+/g, " ") === normalized) ?? null;
  },
}));

import { GET } from "./route";

const get = (id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa") =>
  GET(new Request(`http://localhost/api/library/lesson?id=${encodeURIComponent(id)}`) as never);

beforeEach(() => {
  currentUser = { id: "u1" };
  selectedSubjects = [{ id: "math-id", name: "Mathematics" }];
  lessonSubject = "Geography";
  lessonData = {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    title: "Coastlines",
    topic: "Coastal processes",
    subject: "Geography",
    difficulty: "AS",
    blocks: [],
    helpful_up: 0,
    helpful_down: 0,
  };
  lessonLookup.mockReset();
  voteLookup.mockReset();
});

describe("GET /api/library/lesson subject access", () => {
  it("requires authentication before reading lesson content", async () => {
    currentUser = null;
    expect((await get()).status).toBe(401);
    expect(lessonLookup).not.toHaveBeenCalled();
  });

  it("denies a lesson outside the learner's selected subjects", async () => {
    expect((await get()).status).toBe(403);
    expect(lessonLookup).toHaveBeenCalledOnce();
    expect(voteLookup).not.toHaveBeenCalled();
  });

  it("fails closed before lesson lookup when no subjects are selected", async () => {
    selectedSubjects = [];
    expect((await get()).status).toBe(409);
    expect(lessonLookup).not.toHaveBeenCalled();
  });

  it("returns a lesson when its subject is selected", async () => {
    lessonSubject = "Mathematics";
    const response = await get();
    expect(response.status).toBe(200);
    expect((await response.json()).lesson.subject).toBe("Mathematics");
    expect(voteLookup).toHaveBeenCalledOnce();
  });

  it("rejects malformed lesson IDs before querying", async () => {
    expect((await get("not-an-id")).status).toBe(400);
    expect(lessonLookup).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing lesson", async () => {
    lessonData = null;
    expect((await get()).status).toBe(404);
    expect(voteLookup).not.toHaveBeenCalled();
  });
});
