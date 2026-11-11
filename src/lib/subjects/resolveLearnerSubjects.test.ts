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

  it("resolves the reported ZIMSEC and Cambridge subjects across legacy database labels", async () => {
    const result = await resolveLearnerSubjects(
      clientFor(
        [
          "zimsec-family-religious-studies-o-level",
          "cambridge-business-9609",
          "cambridge-economics-9708",
          "cambridge-geography-9696",
        ],
        ["FRS", "Business 9609", "Economics 9708", "Geography 9696"],
      ),
      "learner-2",
    );
    expect(result.subjects.map(subject => subject.name)).toEqual([
      "Family and Religious Studies (ZIMSEC O Level)",
      "Business (Cambridge 9609)",
      "Economics (Cambridge 9708)",
      "Geography (Cambridge 9696)",
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
