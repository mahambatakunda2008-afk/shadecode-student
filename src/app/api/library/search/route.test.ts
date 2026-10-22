import { beforeEach, describe, expect, it, vi } from "vitest";

let currentUser: { id: string } | null = { id: "u1" };
let selectedSubjects: Array<{ id: string; name: string }> = [{ id: "math-id", name: "Mathematics" }];
const loadLibrary = vi.fn();
const search = vi.fn();
const bestSnippet = vi.fn();

vi.mock("@/lib/rate-limit/limiter", () => ({ applyRateLimit: async () => null, generalApiLimiter: {} }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: currentUser }, error: null }) } }),
}));
vi.mock("@/lib/subjects/resolveLearnerSubjects", () => ({
  resolveLearnerSubjects: async () => ({ subjects: selectedSubjects, onboardingComplete: true }),
  assertRequestedLearnerSubject: (subjects: Array<{ name: string }>, requested?: string | null) => {
    const normalized = (requested ?? "").trim().toLowerCase().replace(/\\s+/g, " ");
    if (!normalized || normalized === "all" || normalized === "general") return null;
    return subjects.find((subject) => subject.name.trim().toLowerCase().replace(/\\s+/g, " ") === normalized) ?? null;
  },
}));
vi.mock("@/lib/library/store", () => ({ loadLibrary }));
vi.mock("@/lib/library/bm25", () => ({ search, bestSnippet }));

import { GET } from "./route";

const get = (query: string) => GET(new Request(`http://localhost/api/library/search?${query}`) as never);

beforeEach(() => {
  currentUser = { id: "u1" };
  selectedSubjects = [{ id: "math-id", name: "Mathematics" }];
  loadLibrary.mockReset();
  search.mockReset();
  bestSnippet.mockReset();
  loadLibrary.mockResolvedValue({ index: {}, rows: new Map() });
  search.mockReturnValue([]);
  bestSnippet.mockReturnValue("");
});

describe("GET /api/library/search subject access", () => {
  it("requires authentication", async () => {
    currentUser = null;
    expect((await get("q=algebra&subject=Mathematics")).status).toBe(401);
    expect(loadLibrary).not.toHaveBeenCalled();
  });

  it("rejects an unselected subject before loading or searching the library", async () => {
    const response = await get("q=coastlines&subject=Geography");
    expect(response.status).toBe(403);
    expect(loadLibrary).not.toHaveBeenCalled();
    expect(search).not.toHaveBeenCalled();
  });

  it.each(["all", "General", ""])("rejects broad subject scope %s", async (subject) => {
    const response = await get(`q=algebra&subject=${encodeURIComponent(subject)}`);
    expect(response.status).toBe(403);
    expect(loadLibrary).not.toHaveBeenCalled();
  });

  it("searches only the explicitly selected subject", async () => {
    await get("q=algebra&subject=Mathematics");
    expect(loadLibrary).toHaveBeenCalledOnce();
    expect(search).toHaveBeenCalledWith({}, "algebra", { subject: "Mathematics", limit: 8 });
  });

  it("fails closed when onboarding has no selected subjects", async () => {
    selectedSubjects = [];
    expect((await get("q=algebra&subject=Mathematics")).status).toBe(409);
    expect(loadLibrary).not.toHaveBeenCalled();
  });
});
