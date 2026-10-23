import { beforeEach, describe, expect, it, vi } from "vitest";

const { user, paper, syllabus, signedUrl, createSignedUrl, state } = vi.hoisted(() => ({
  user: { value: { id: "learner-1" } as { id: string } | null },
  paper: { value: { id: "paper-1", syllabus_id: "syllabus-1", file_path: "paper.pdf" } as Record<string, unknown> | null },
  syllabus: { value: { id: "syllabus-1", subject: "Chemistry" } as Record<string, unknown> | null },
  signedUrl: { value: "https://storage.example/signed-paper" },
  createSignedUrl: vi.fn(),
  state: { value: null as Record<string, unknown> | null },
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: user.value }, error: null }) },
    from: (table: string) => {
      const row = table === "past_papers" ? paper.value : table === "syllabi" ? syllabus.value : state.value;
      const query: Record<string, unknown> = {};
      query.select = vi.fn(() => query);
      query.eq = vi.fn(() => query);
      query.maybeSingle = vi.fn(async () => ({ data: row, error: null }));
      return query;
    },
    storage: { from: vi.fn(() => ({ createSignedUrl })) },
  }),
}));

vi.mock("@/lib/subjects/resolveLearnerSubjects", () => ({
  resolveLearnerSubjects: vi.fn(async () => ({
    subjects: [{ id: "math-id", name: "Mathematics" }],
  })),
}));

import { GET } from "./route";

const get = () => GET(new Request("http://localhost/api/exam-hub/papers/paper-1"), {
  params: Promise.resolve({ id: "paper-1" }),
});

describe("GET /api/exam-hub/papers/[id] subject access", () => {
  beforeEach(() => {
    user.value = { id: "learner-1" };
    paper.value = { id: "paper-1", syllabus_id: "syllabus-1", file_path: "paper.pdf" };
    syllabus.value = { id: "syllabus-1", subject: "Chemistry" };
    signedUrl.value = "https://storage.example/signed-paper";
    createSignedUrl.mockReset().mockResolvedValue({ data: { signedUrl: signedUrl.value }, error: null });
    state.value = null;
  });

  it("rejects a paper from a subject the learner has not selected before signing a URL", async () => {
    const response = await get();
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "SUBJECT_NOT_ALLOWED" });
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("does not expose papers to unauthenticated requests", async () => {
    user.value = null;
    const response = await get();
    expect(response.status).toBe(401);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("signs a paper only when its syllabus matches a selected subject", async () => {
    syllabus.value = { id: "syllabus-1", subject: "Mathematics" };
    const response = await get();
    expect(response.status).toBe(200);
    expect(createSignedUrl).toHaveBeenCalledWith("paper.pdf", 600);
    expect(await response.json()).toMatchObject({ signedUrl: signedUrl.value, paper: { id: "paper-1" } });
  });
});
