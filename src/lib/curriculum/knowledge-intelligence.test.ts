import { describe, expect, it } from "vitest";
import { discoverSyllabusVersion } from "./version-discovery";
import { diffCurriculumKnowledge } from "./knowledge-change-intelligence";
import type { CurriculumKnowledgeItem } from "./knowledge";

const identity = {
  boardId: "example-board",
  qualificationId: "example-qualification",
  level: "o_level",
  syllabusId: "example-syllabus",
  syllabusVersion: "2026-2030",
  subjectId: "computer-science",
};
const provenance = {
  authority: "Example Authority",
  sourceDocument: "https://example.org/syllabus.pdf",
  sourceUrl: "https://example.org/syllabus.pdf",
  retrievedAt: "2026-09-09T00:00:00.000Z",
  mappingStatus: "pending" as const,
};

function item(overrides: Partial<CurriculumKnowledgeItem>): CurriculumKnowledgeItem {
  return {
    id: crypto.randomUUID(),
    kind: "content_scope",
    title: "Algorithms",
    content: "Describe algorithms.",
    status: "draft",
    identity,
    provenance,
    ...overrides,
  };
}

describe("curriculum intelligence", () => {
  it("discovers an explicit syllabus version conservatively", () => {
    const result = discoverSyllabusVersion("Computer Science Syllabus 2026-2030");
    expect(result.version).toBe("2026-2030");
    expect(result.confidence).toBe("high");
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it("does not invent a version when none is explicit", () => {
    expect(discoverSyllabusVersion("Computer Science curriculum overview").version).toBeNull();
  });

  it("detects content modification and relationship changes", () => {
    const parent = item({ kind: "topic", title: "Programming", content: "Programming" });
    const previous = [item({ parentId: parent.id })];
    const current = [item({ id: previous[0].id, parentId: parent.id, content: "Explain algorithms." })];
    expect(diffCurriculumKnowledge(previous, current)[0].type).toBe("modified");

    const moved = [item({ id: previous[0].id, parentId: undefined })];
    expect(diffCurriculumKnowledge(previous, moved)[0].type).toBe("relationship_changed");
  });
});
