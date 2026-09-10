import { describe, expect, it } from "vitest";
import { buildLearnCurriculumGrounding } from "./learn-grounding";
import type { CurriculumKnowledgeItem } from "./knowledge";

const item = (overrides: Partial<CurriculumKnowledgeItem>): CurriculumKnowledgeItem => ({
  id: overrides.id ?? "test-id",
  kind: overrides.kind ?? "topic",
  title: overrides.title ?? "Binary addition",
  content: overrides.content ?? "Add binary numbers using place values and carrying.",
  status: overrides.status ?? "verified",
  identity: overrides.identity ?? { boardId: "zimsec", qualificationId: "o-level", level: "o-level", syllabusId: "4021", syllabusVersion: "2024-2030", subjectId: "computer-science" },
  provenance: overrides.provenance ?? { authority: "ZIMSEC", sourceDocument: "syllabus.pdf", sourceUrl: "https://example.test/syllabus.pdf", retrievedAt: "2026-09-10T00:00:00Z", mappingStatus: "verified" },
  ...overrides,
});

describe("buildLearnCurriculumGrounding", () => {
  it("selects the exact verified topic and related syllabus knowledge", () => {
    const result = buildLearnCurriculumGrounding("Binary addition", [
      item({ id: "topic", kind: "topic", title: "Binary addition", topicCode: "DR-2" }),
      item({ id: "outcome", kind: "learning_outcome", title: "Data representation outcomes", content: "Perform binary addition.", topicCode: "DR-2" }),
      item({ id: "draft", status: "draft", title: "Binary addition advanced tricks" }),
      item({ id: "other", title: "Web design" }),
    ]);
    expect(result.blocked).toBe(false);
    expect(result.knowledgeIds).toContain("topic");
    expect(result.knowledgeIds).toContain("outcome");
    expect(result.knowledgeIds).not.toContain("draft");
  });

  it("blocks when no verified knowledge exists", () => {
    const result = buildLearnCurriculumGrounding("Binary addition", [item({ status: "draft" })]);
    expect(result.blocked).toBe(true);
    expect(result.items).toHaveLength(0);
  });

  it("does not pretend an unmapped topic is syllabus content", () => {
    const result = buildLearnCurriculumGrounding("Quantum cryptography", [item({ title: "Binary addition" })]);
    expect(result.blocked).toBe(false);
    expect(result.items).toHaveLength(0);
    expect(result.reason).toContain("enrichment");
  });
});
