import { describe, expect, it } from "vitest";
import { buildResolvedLessonPrompt, resolveLessonRequest } from "./lessonRequest";

describe("resolveLessonRequest", () => {
  it("keeps explicit subject and exact prompt", () => {
    const result = resolveLessonRequest({
      prompt: "Explain deformation of solids using stress, strain and Young modulus",
      subject: "Physics",
      level: "AS Level",
      examBoard: "Cambridge",
      goal: "Exam mastery",
    });

    expect(result.subject).toBe("Physics");
    expect(result.prompt).toBe("Explain deformation of solids using stress, strain and Young modulus");
    expect(result.level).toBe("AS Level");
    expect(result.examBoard).toBe("Cambridge");
    expect(result.needsClarification).toBe(false);
  });

  it("does not turn an ultra-short prompt into a lesson", () => {
    const result = resolveLessonRequest({ prompt: "P", subject: "Physics" });

    expect(result.prompt).toBe("P");
    expect(result.subject).toBe("Physics");
    expect(result.shortPrompt).toBe(true);
    expect(result.needsClarification).toBe(true);
    expect(buildResolvedLessonPrompt(result)).toContain("ultra-short request");
  });

  it("requires subject when it cannot be resolved", () => {
    const result = resolveLessonRequest({ prompt: "Teach me this concept" });

    expect(result.subject).toBe("");
    expect(result.ambiguousSubject).toBe(true);
    expect(result.needsClarification).toBe(false);
  });
});
