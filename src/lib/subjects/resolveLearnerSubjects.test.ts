import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveLearnerSubjects } from "./resolveLearnerSubjects";

function clientFor(profileSubjects: string[], catalogNames: string[]) {
  const profileQuery = {
    select: () => profileQuery,
    eq: () => profileQuery,
    maybeSingle: async () => ({
      data: { subjects: profileSubjects, onboarding_completed: true },
      error: null,
    }),
  };
  const catalogQuery = {
    select: () => catalogQuery,
    eq: () => catalogQuery,
    order: async () => ({
      data: catalogNames.map((name, index) => ({ id: `subject-${index}`, name })),
      error: null,
    }),
  };
  return {
    from: (table: string) => table === "profiles" ? profileQuery : catalogQuery,
  } as unknown as SupabaseClient;
}

describe("resolveLearnerSubjects cross-client identity", () => {
  it("resolves native stable IDs against database rows stored with legacy aliases", async () => {
    const result = await resolveLearnerSubjects(
      clientFor(["mathematics", "english-language", "computer-science"], ["Maths", "English", "Computer Science"]),
      "learner-1",
    );
    expect(result.subjects.map((subject) => subject.name)).toEqual([
      "Mathematics",
      "English Language",
      "Computer Science",
    ]);
  });

  it("keeps custom subjects while removing duplicate aliases", async () => {
    const result = await resolveLearnerSubjects(
      clientFor(["Maths", "mathematics", "Marine Engineering"], ["Mathematics", "Marine Engineering"]),
      "learner-1",
    );
    expect(result.subjects.map((subject) => subject.name)).toEqual([
      "Mathematics",
      "Marine Engineering",
    ]);
  });
});
