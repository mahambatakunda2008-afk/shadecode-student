import { beforeEach, describe, expect, it, vi } from "vitest";

let currentUser: { id: string } | null = { id: "u1" };
let selectedSubjects: Array<{ id: string; name: string }> = [{ id: "math-id", name: "Mathematics" }];
const sourceQuery = vi.fn();
const syllabusRows = [
  { id: "math-syllabus", subject: "Mathematics" },
  { id: "geo-syllabus", subject: "Geography" },
];

vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }));
vi.mock("@/lib/subjects/resolveLearnerSubjects", () => ({
  resolveLearnerSubjects: async () => ({ subjects: selectedSubjects, onboardingComplete: true }),
  assertRequestedLearnerSubject: (subjects: Array<{ name: string }>, requested?: string | null) => {
    const normalized = (requested ?? "").trim().toLowerCase().replace(/\\s+/g, " ");
    if (!normalized || normalized === "all" || normalized === "general") return null;
    return subjects.find((subject) => subject.name.trim().toLowerCase().replace(/\\s+/g, " ") === normalized) ?? null;
  },
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: currentUser }, error: null }) },
    from: (table: string) => {
      const state: { filters: Array<[string, unknown]>; selected: string } = { filters: [], selected: "" };
      const builder: any = {
        select(value: string) { state.selected = value; return builder; },
        eq(key: string, value: unknown) { state.filters.push([key, value]); return builder; },
        in(key: string, value: unknown) { state.filters.push([key, value]); return builder; },
        order() { return builder; },
        then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
          if (table === "syllabi") return Promise.resolve({ data: syllabusRows, error: null }).then(resolve, reject);
          sourceQuery({ filters: [...state.filters], selected: state.selected });
          return Promise.resolve({ data: [], error: null }).then(resolve, reject);
        },
      };
      return builder;
    },
  }),
}));

import { GET } from "./route";
const get = (query = "") => GET(new Request(`http://localhost/api/exam-hub/sources${query ? `?${query}` : ""}`));

beforeEach(() => {
  currentUser = { id: "u1" };
  selectedSubjects = [{ id: "math-id", name: "Mathematics" }];
  sourceQuery.mockReset();
});

describe("GET /api/exam-hub/sources subject access", () => {
  it("requires authentication", async () => {
    currentUser = null;
    expect((await get()).status).toBe(401);
    expect(sourceQuery).not.toHaveBeenCalled();
  });
  it("filters source metadata to selected-subject syllabus IDs", async () => {
    expect((await get()).status).toBe(200);
    expect(sourceQuery).toHaveBeenCalledOnce();
    expect(sourceQuery.mock.calls[0][0].filters).toContainEqual(["syllabus_id", ["math-syllabus"]]);
  });
  it("rejects an explicitly requested unselected syllabus", async () => {
    expect((await get("syllabus_id=geo-syllabus")).status).toBe(403);
    expect(sourceQuery).not.toHaveBeenCalled();
  });
  it("fails closed when onboarding has no selected subjects", async () => {
    selectedSubjects = [];
    expect((await get()).status).toBe(409);
    expect(sourceQuery).not.toHaveBeenCalled();
  });
});
