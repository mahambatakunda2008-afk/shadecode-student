import { describe, expect, it } from "vitest";
import { isContentAligned, isScopeUsable, type LearningContentItem, type LearningScope } from "./learning-scope";

const identity = { kind: "curriculum" as const, boardId: "zimsec", syllabusId: "computer-science-4021", syllabusVersion: "2024-2030", subjectId: "computer-science" };
const provenance = { authority: "ZIMSEC", sourceDocument: "verified syllabus", retrievedAt: "2026-09-10", mappingStatus: "verified" as const };
const item = (id: string, status: LearningContentItem["status"] = "verified"): LearningContentItem => ({ id, kind: "topic", title: id, content: id, status, identity, provenance: status === "archived" ? undefined : provenance });
const scope = (content: LearningContentItem[], complete = true, verified = true): LearningScope => ({ identity, content, complete, verified });

describe("learning scope verification gate", () => {
  it("accepts a complete scope only when every active item is verified", () => {
    expect(isScopeUsable(scope([item("topic-1"), item("topic-2")]))).toBe(true);
    expect(isScopeUsable(scope([item("topic-1"), item("topic-2", "draft")]))).toBe(false);
  });

  it("rejects content whose provenance has not been fully verified", () => {
    const reviewed = { ...item("topic-1"), provenance: { ...provenance, mappingStatus: "reviewed" as const } };
    expect(isScopeUsable(scope([reviewed]))).toBe(false);
  });

  it("ignores archived content when checking the current complete scope", () => {
    expect(isScopeUsable(scope([item("topic-1"), item("old", "archived")]))).toBe(true);
  });

  it("requires explicit completeness and verification flags", () => {
    expect(isScopeUsable(scope([item("topic-1")], false, true))).toBe(false);
    expect(isScopeUsable(scope([item("topic-1")], true, false))).toBe(false);
  });

  it("aligns activities only to verified content in a usable complete scope", () => {
    expect(isContentAligned(["topic-1"], scope([item("topic-1"), item("topic-2")]))).toBe(true);
    expect(isContentAligned(["missing"], scope([item("topic-1"), item("topic-2")]))).toBe(false);
    expect(isContentAligned(["topic-1"], scope([item("topic-1", "draft")]))).toBe(false);
  });
});
