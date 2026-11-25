import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("canonical learning event projection boundary", () => {
  it("keeps client labels as telemetry and requires a server-verified topic for projection", () => {
    const source = readFileSync("src/app/api/intelligence/events/route.ts", "utf8");
    expect(source).toContain('const resolvedIdentity = curriculum.resolved.status === "resolved" ? curriculum.identity : undefined;');
    expect(source).toContain('const verifiedTopic = resolvedIdentity && topicMapping.status === "matched" ? topicMapping : undefined;');
    expect(source).toContain('reason: "unverified-curriculum-topic"');
    expect(source).toContain("subjectId: resolvedIdentity.subjectName ?? resolvedIdentity.subjectId");
    expect(source).toContain("topicId: verifiedTopic.title");
    expect(source.indexOf("const verifiedTopic")).toBeLessThan(source.indexOf("projectLearningEvent(projectionClient"));
  });

  it("does not use browser metadata as the subject identity for mastery", () => {
    const source = readFileSync("src/lib/intelligence/projectLearningEvent.ts", "utf8");
    expect(source).toContain("const subjectId = event.subjectId?.trim() ?? \"\";");
    expect(source).not.toContain("event.metadata.subject");
  });
});
