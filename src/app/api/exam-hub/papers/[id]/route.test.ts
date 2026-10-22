import { beforeEach, describe, expect, it, vi } from "vitest";

let currentUser: { id: string } | null = { id: "learner-1" };
let selectedSubjects: Array<{ id: string; name: string }> = [{ id: "math", name: "Mathematics" }];
let paperSubject = "Mathematics";
const createSignedUrl = vi.fn(async () => ({ data: { signedUrl: "https://example.test/signed" }, error: null }));

vi.mock("@/lib/subjects/resolveLearnerSubjects", () => ({
  resolveLearnerSubjects: async () => ({ subjects: selectedSubjects, onboardingComplete: true }),
  assertRequestedLearnerSubject: (subjects: Array<{ name: string }>, requested: string) =>
    subjects.find((subject) => subject.name.trim().toLowerCase() === requested.trim().toLowerCase()) ?? null,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: currentUser }, error: null }) },
    from: (table: string) => {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        single: async () => table === "past_papers"
          ? { data: { id: "paper-1", syllabus_id: "syllabus-1", file_path: "paper.pdf" }, error: null }
          : { data: null, error: null },
        maybeSingle: async () => table === "syllabi"
          ? { data: { id: "syllabus-1", subject: paperSubject }, error: null }
          : { data: null, error: null },
      };
      return builder;
    },
    storage: { from: () => ({ createSignedUrl }) },
  }),
}));

import { GET } from "./route";

const get = () => GET(new Request("http://localhost/api/exam-hub/papers/paper-1"), {
  params: Promise.resolve({ id: "paper-1" }),
});

beforeEach(() => {
  currentUser = { id: "learner-1" };
  selectedSubjects = [{ id: "math", name: "Mathematics" }];
  paperSubject = "Mathematics";
  createSignedUrl.mockClear();
});

describe("GET /api/exam-hub/papers/[id] subject access", () => {
  it("requires authentication", async () => {
    currentUser = null;
    expect((await get()).status).toBe(401);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("does not issue a signed URL for an unselected subject", async () => {
    paperSubject = "Geography";
    const response = await get();
    expect(response.status).toBe(403);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("fails closed when no subjects are selected", async () => {
    selectedSubjects = [];
    const response = await get();
    expect(response.status).toBe(409);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("issues a signed URL for a selected subject", async () => {
    const response = await get();
    expect(response.status).toBe(200);
    expect(createSignedUrl).toHaveBeenCalledOnce();
  });
});
