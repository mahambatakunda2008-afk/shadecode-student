import { describe, expect, it } from "vitest";
import type { LearningContentItem, LearningScope, LearningScopeIdentity } from "../code-lab/learning-scope";
import { createContentInventory, reconcileLearningScope } from "./reconciliation";

const identity: LearningScopeIdentity = {
  kind: "curriculum",
  authorityId: "zimsec",
  boardId: "zimsec",
  qualificationId: "zimsec-o-level",
  level: "o_level",
  syllabusId: "zimsec-4021",
  syllabusVersion: "2024-2030",
  subjectId: "computer-science",
};

const verified = (id: string, parentId?: string): LearningContentItem => ({
  id,
  kind: parentId ? "subtopic" : "topic",
  title: id,
  content: id,
  parentId,
  status: "verified",
  identity,
  provenance: {
    authority: "ZIMSEC",
    sourceDocument: "official syllabus",
    retrievedAt: "2026-09-10",
    mappingStatus: "verified",
  },
});

const scope = (content: LearningContentItem[], flags = { complete: true, verified: true }): LearningScope => ({
  identity,
  content,
  ...flags,
});

describe("reconcileLearningScope", () => {
  it("accepts an exact complete verified inventory", () => {
    const content = [verified("topic-1"), verified("subtopic-1", "topic-1")];
    const result = reconcileLearningScope(scope(content), createContentInventory(identity, content));
    expect(result.usable).toBe(true);
    expect(result.missingIds).toEqual([]);
    expect(result.orphanedIds).toEqual([]);
  });

  it("reports authoritative content that is missing", () => {
    const content = [verified("topic-1")];
    const inventory = createContentInventory(identity, [...content, verified("topic-2")]);
    const result = reconcileLearningScope(scope(content), inventory);
    expect(result.usable).toBe(false);
    expect(result.missingIds).toEqual(["topic-2"]);
  });

  it("rejects active content outside the authoritative inventory", () => {
    const content = [verified("topic-1"), verified("not-authoritative")];
    const inventory = createContentInventory(identity, [content[0]]);
    const result = reconcileLearningScope(scope(content), inventory);
    expect(result.orphanedIds).toEqual(["not-authoritative"]);
    expect(result.usable).toBe(false);
  });

  it("rejects duplicate IDs", () => {
    const content = [verified("topic-1"), verified("topic-1")];
    const result = reconcileLearningScope(scope(content), createContentInventory(identity, [content[0]]));
    expect(result.issues.some((issue) => issue.code === "duplicate-id")).toBe(true);
    expect(result.usable).toBe(false);
  });

  it("rejects orphaned parent references", () => {
    const content = [verified("subtopic-1", "missing-parent")];
    const result = reconcileLearningScope(scope(content), createContentInventory(identity, content));
    expect(result.issues.some((issue) => issue.code === "invalid-parent")).toBe(true);
    expect(result.usable).toBe(false);
  });

  it("rejects reviewed but unverified content", () => {
    const item = verified("topic-1");
    item.status = "draft";
    item.provenance!.mappingStatus = "reviewed";
    const result = reconcileLearningScope(scope([item]), createContentInventory(identity, [item]));
    expect(result.verified).toBe(false);
    expect(result.usable).toBe(false);
  });

  it("rejects identity mismatches", () => {
    const otherIdentity = { ...identity, syllabusVersion: "2099" };
    const content = [verified("topic-1")];
    const result = reconcileLearningScope(scope(content), {
      identity: otherIdentity,
      expectedContentIds: ["topic-1"],
    });
    expect(result.issues.some((issue) => issue.code === "identity-mismatch")).toBe(true);
    expect(result.usable).toBe(false);
  });
});
