import { beforeEach, describe, expect, it, vi } from "vitest";

let currentUser: { id: string } | null = { id: "u1" };
let selectedSubjects: Array<{ id: string; name: string }> = [{ id: "math-id", name: "Mathematics" }];
const loadLibrary = vi.fn();
const recoverLesson = vi.fn();

vi.mock("@/lib/rate-limit/limiter", () => ({ applyRateLimit: async () => null, generalApiLimiter: {} }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: currentUser }, error: null }) } }) }));
vi.mock("@/lib/subjects/resolveLearnerSubjects", () => ({
  resolveLearnerSubjects: async () => ({ subjects: selectedSubjects, onboardingComplete: true }),
  assertRequestedLearnerSubject: (subjects: Array<{ name: string }>, requested?: string | null) => {
    const normalized = (requested ?? "").trim().toLowerCase().replace(/\\s+/g, " ");
    if (!normalized || normalized === "all" || normalized === "general") return null;
    return subjects.find((subject) => subject.name.trim().toLowerCase().replace(/\\s+/g, " ") === normalized) ?? null;
  },
}));
vi.mock("@/lib/library/store", () => ({ loadLibrary }));
vi.mock("@/lib/library/recover", () => ({ recoverLesson }));

import { GET } from "./route";
const get = (query: string) => GET(new Request(`http://localhost/api/library/recover?${query}`) as never);

beforeEach(() => {
  currentUser = { id: "u1" };
  selectedSubjects = [{ id: "math-id", name: "Mathematics" }];
  loadLibrary.mockReset();
  recoverLesson.mockReset();
  loadLibrary.mockResolvedValue({ index: {}, rows: new Map() });
});

describe("GET /api/library/recover subject access", () => {
  it("requires authentication", async () => {
    currentUser = null;
    expect((await get("subject=Mathematics&topic=Algebra")).status).toBe(401);
    expect(loadLibrary).not.toHaveBeenCalled();
  });
  it("denies recovery for a subject the learner did not select before loading library data", async () => {
    expect((await get("subject=Geography&topic=Coastlines")).status).toBe(403);
    expect(loadLibrary).not.toHaveBeenCalled();
    expect(recoverLesson).not.toHaveBeenCalled();
  });
  it("fails closed if the learner has no selected subjects", async () => {
    selectedSubjects = [];
    expect((await get("subject=Mathematics&topic=Algebra")).status).toBe(409);
    expect(loadLibrary).not.toHaveBeenCalled();
  });
  it("rejects broad subject scopes", async () => {
    expect((await get("subject=General&topic=Algebra")).status).toBe(403);
    expect(loadLibrary).not.toHaveBeenCalled();
  });
});
