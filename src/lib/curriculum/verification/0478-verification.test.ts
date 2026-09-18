import { describe, expect, it } from "vitest";
import { CURRICULUM_COMPLETENESS_DIMENSIONS, type CurriculumCoverageCheck } from "../completeness";
import type { CurriculumExtraction, CurriculumKnowledgeDraft } from "../ingestion";
import { CAMBRIDGE_0478_2026_2028_REQUIRED_KINDS, CAMBRIDGE_0478_2026_2028_TOPICS, CAMBRIDGE_0478_2026_2028_VERIFICATION_MANIFEST } from "./0478-2026-2028";
import { verifyCurriculumBundle } from "../verification";

const checks: CurriculumCoverageCheck[] = CURRICULUM_COMPLETENESS_DIMENSIONS.map((dimension) => ({
  dimension,
  status: dimension === "project_requirements" || dimension === "coursework_requirements" ? "not_applicable" : "verified",
}));

const extraction: CurriculumExtraction = {
  source: {
    authority: "Cambridge International",
    sourceUrl: CAMBRIDGE_0478_2026_2028_VERIFICATION_MANIFEST.officialUrl,
    sourceDocument: "Cambridge IGCSE Computer Science 0478 2026-2028",
    retrievedAt: "2026-09-18",
  },
  documentHash: "test-hash",
  pageCount: 56,
  sections: [],
  rawText: [
    "Cambridge IGCSE Computer Science 0478 2026-2028",
    "Paper 1 Computer Systems 75 marks 105 minutes 50 percent topics 1-6 calculators false externally assessed true",
    "Paper 2 Algorithms, Programming and Logic 75 marks 105 minutes 50 percent topics 7-10 calculators false externally assessed true",
    "AO1 40 AO2 40 AO3 20",
  ].join("\n"),
};

const knowledge: CurriculumKnowledgeDraft[] = [
  ...CAMBRIDGE_0478_2026_2028_REQUIRED_KINDS.map((kind) => ({
    kind,
    knowledgeKey: `${kind}:test`,
    title: kind,
    content: `verified ${kind}`,
    objectiveKeys: [],
    topicKey: CAMBRIDGE_0478_2026_2028_TOPICS[0],
    metadata: {},
    provenance: { mappingStatus: "verified" },
  })),
  ...CAMBRIDGE_0478_2026_2028_TOPICS.slice(1).map((topicKey) => ({
    kind: "content_scope" as const,
    knowledgeKey: `content_scope:${topicKey}`,
    title: topicKey,
    content: `verified ${topicKey}`,
    objectiveKeys: [],
    topicKey,
    metadata: {},
    provenance: { mappingStatus: "verified" },
  })),
];

describe("Cambridge 0478 production verification manifest", () => {
  it("passes when all manifest kinds, topic keys and assessment details are evidenced", () => {
    const result = verifyCurriculumBundle(
      extraction,
      knowledge,
      checks,
      CAMBRIDGE_0478_2026_2028_VERIFICATION_MANIFEST,
    );

    expect(result.complete).toBe(true);
    expect(result.manifest?.verified).toBe(true);
    expect(result.verified).toBe(true);
  });

  it("fails when a required topic is missing", () => {
    const incomplete = knowledge.filter(
      (item) => item.topicKey !== "boolean-logic",
    );

    const result = verifyCurriculumBundle(
      extraction,
      incomplete,
      checks,
      CAMBRIDGE_0478_2026_2028_VERIFICATION_MANIFEST,
    );

    expect(result.manifest?.verified).toBe(false);
    expect(result.manifest?.issues.some((issue) => issue.code === "missing-topic-key")).toBe(true);
    expect(result.verified).toBe(false);
  });

  it("fails when assessment evidence disagrees with the manifest", () => {
    const incorrectExtraction = {
      ...extraction,
      rawText: extraction.rawText
        .replace("Paper 1 Computer Systems 75 marks", "Paper 1 Computer Systems 70 marks")
        .replace("Paper 2 Algorithms, Programming and Logic 75 marks", "Paper 2 Algorithms, Programming and Logic 71 marks"),
    };

    const result = verifyCurriculumBundle(
      incorrectExtraction,
      knowledge,
      checks,
      CAMBRIDGE_0478_2026_2028_VERIFICATION_MANIFEST,
    );

    expect(result.manifest?.verified).toBe(false);
    expect(result.manifest?.issues.filter((issue) => issue.code === "missing-assessment-detail").length).toBeGreaterThan(0);
    expect(result.verified).toBe(false);
  });
});
