import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertRequestedLearnerSubject,
  canonicalizeSubjectName,
  resolveLearnerSubjects,
} from "./resolveLearnerSubjects";

describe("learner subject canonicalization", () => {
  it("resolves stable IDs and display-name variants to the same subject", () => {
    expect(canonicalizeSubjectName("computer-science")).toBe("Computer Science");
    expect(canonicalizeSubjectName("Computer Science")).toBe("Computer Science");
    expect(canonicalizeSubjectName("computer_science")).toBe("Computer Science");
  });

  it("accepts a requested subject by its stable ID when the learner selected its display name", () => {
    const subjects = [{ id: "cs-1", name: "Computer Science" }];
    expect(assertRequestedLearnerSubject(subjects, "computer-science")).toEqual(subjects[0]);
  });

  it("maps profile subject IDs to the matching per-user catalogue row", async () => {
    const profileQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: { subjects: ["computer-science"], onboarding_completed: true },
            error: null,
          })),
        })),
      })),
    };
    const catalogQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(async () => ({
            data: [{ id: "cs-1", name: "Computer Science" }],
            error: null,
          })),
        })),
      })),
    };
    const supabase = {
      from: vi.fn((table: string) => table === "profiles" ? profileQuery : catalogQuery),
    } as unknown as SupabaseClient;

    await expect(resolveLearnerSubjects(supabase, "learner-1")).resolves.toEqual({
      subjects: [{ id: "cs-1", name: "Computer Science" }],
      onboardingComplete: true,
    });
  });
});
