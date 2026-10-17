import { describe, expect, it } from "vitest";
import { buildResolvedLessonPrompt, resolveLessonRequest } from "./lessonRequest";

describe("direct lesson prompt contract", () => {
  it("prefers direct teaching over narrative filler", () => {
    const request = resolveLessonRequest({ prompt: "integration", subject: "Mathematics" });
    const prompt = buildResolvedLessonPrompt(request);

    expect(prompt).toContain("Prefer direct explanations, worked steps, compact examples, and practice over narrative framing.");
    expect(prompt).toContain("no fictional narratives, anecdotes, narrative hooks, or story-based analogies");
  });

  it("teaches story composition as a craft instead of generating a full story", () => {
    const request = resolveLessonRequest({ prompt: "Story Composition", subject: "English" });
    const prompt = buildResolvedLessonPrompt(request);

    expect(prompt).toContain("For creative-writing topics, teach the method instead of generating a full story unless explicitly requested.");
    expect(prompt).toContain("short annotated excerpts");
  });
});
