import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveLearnerSubject } from "./subjectAccess";

const { profile, subjectRows, lookupError } = vi.hoisted(() => ({
  profile: { value: { subjects: ["Mathematics", "Physics"], onboarding_completed: true } as Record<string, unknown> | null },
  subjectRows: { value: [{ id: "math-id", name: "Mathematics" }] as Array<{ id: string; name: string }> },
  lookupError: { value: null as { message: string } | null },
}));

function queryFor(table: string) {
  const query: Record<string, unknown> = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.maybeSingle = vi.fn(async () => table === "profiles"
    ? { data: profile.value, error: null }
    : { data: subjectRows.value[0] ?? null, error: lookupError.value });
  query.single = vi.fn(async () => ({ data: { id: "new-id" }, error: null }));
  query.insert = vi.fn(() => query);
  query.then = (resolve: (value: unknown) => unknown) => Promise.resolve({
    data: table === "subjects" ? subjectRows.value : null,
    error: lookupError.value,
  }).then(resolve);
  return query;
}

const supabase = {
  from: vi.fn((table: string) => queryFor(table)),
} as never;

describe("resolveLearnerSubject", () => {
  beforeEach(() => {
    profile.value = { subjects: ["Mathematics", "Physics"], onboarding_completed: true };
    subjectRows.value = [{ id: "math-id", name: "Mathematics" }];
    lookupError.value = null;
    (supabase as { from: ReturnType<typeof vi.fn> }).from.mockClear();
  });

  it("fails closed for a subject absent from the learner profile", async () => {
    const result = await resolveLearnerSubject(supabase, "learner-1", "Chemistry");
    expect(result).toMatchObject({ ok: false, status: 403 });
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase.from).toHaveBeenCalledWith("profiles");
  });

  it("requires onboarding subjects before granting access", async () => {
    profile.value = { subjects: [], onboarding_completed: true };
    const result = await resolveLearnerSubject(supabase, "learner-1", "Mathematics");
    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it("rejects General even when it is requested as a subject", async () => {
    const result = await resolveLearnerSubject(supabase, "learner-1", "General");
    expect(result).toMatchObject({ ok: false, status: 403 });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("resolves case and separator variants to the learner's canonical subject", async () => {
    const result = await resolveLearnerSubject(supabase, "learner-1", "mathematics");
    expect(result).toEqual({ ok: true, subject: "Mathematics", subjectId: "math-id" });
  });

  it("rejects a subject id that belongs to a different configured subject", async () => {
    subjectRows.value = [{ id: "physics-id", name: "Physics" }];
    const result = await resolveLearnerSubject(supabase, "learner-1", "Mathematics", "physics-id");
    expect(result).toMatchObject({ ok: false, status: 403 });
  });
});
