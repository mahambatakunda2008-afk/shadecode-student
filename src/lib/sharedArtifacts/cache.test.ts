import { describe, expect, it } from "vitest";
import { buildSharedArtifactCacheKey, isSafeToShareLesson } from "./cache";

const lesson = {
  title: "Waves: describing and measuring wave motion",
  blocks: Array.from({ length: 10 }, (_, index) => ({
    type: index === 0 ? "objective" : "concept",
    title: "Section " + String(index + 1),
    content: "A wave transfers energy without overall transfer of matter. This explanation provides the key relationship and a clear example.",
  })),
};

describe("shared learning artifact cache keys", () => {
  it("normalizes cosmetic differences while keeping subject, board, level and difficulty boundaries", () => {
    const base = { artifactType: "lesson", subject: "Physics", topic: "Waves: describing wave motion", difficulty: "medium", level: "AS", examBoard: "Cambridge" };
    expect(buildSharedArtifactCacheKey(base)).toBe(buildSharedArtifactCacheKey({ ...base, topic: " waves describing wave motion ", subject: "PHYSICS" }));
    expect(buildSharedArtifactCacheKey(base)).not.toBe(buildSharedArtifactCacheKey({ ...base, subject: "Computer Science" }));
    expect(buildSharedArtifactCacheKey(base)).not.toBe(buildSharedArtifactCacheKey({ ...base, examBoard: "ZIMSEC" }));
    expect(buildSharedArtifactCacheKey(base)).not.toBe(buildSharedArtifactCacheKey({ ...base, level: "A Level" }));
    expect(buildSharedArtifactCacheKey(base)).not.toBe(buildSharedArtifactCacheKey({ ...base, difficulty: "hard" }));
    expect(buildSharedArtifactCacheKey({ ...base, topic: "C++" })).not.toBe(buildSharedArtifactCacheKey({ ...base, topic: "C#" }));
    expect(buildSharedArtifactCacheKey({ ...base, topic: "C" })).not.toBe(buildSharedArtifactCacheKey({ ...base, topic: "C++" }));
  });

  it("accepts substantial general educational content", () => {
    expect(isSafeToShareLesson("Waves", lesson)).toBe(true);
  });

  it("rejects personal prompts and obvious personal identifiers", () => {
    expect(isSafeToShareLesson("My grades in Physics", lesson)).toBe(false);
    expect(isSafeToShareLesson("Waves", { ...lesson, blocks: lesson.blocks.map((block, index) => index === 2 ? { ...block, content: "Contact learner@example.com for the notes. " + block.content } : block) })).toBe(false);
    expect(isSafeToShareLesson("Waves", { ...lesson, blocks: lesson.blocks.map((block, index) => index === 2 ? { ...block, content: "Your previous score shows you struggle with this. " + block.content } : block) })).toBe(false);
  });
});
