import { describe, expect, it } from "vitest";
import { resolveVerifiedCurriculumTopic } from "./topic-mapping";
import type { ResolvedCurriculumContext } from "./resolver";

const curriculum = (topics: Array<{ code: string; title: string; topicCode?: string }>): ResolvedCurriculumContext => ({
  status: "resolved",
  reason: "verified",
  objectives: [],
  mappings: [],
  knowledge: topics.map((topic) => ({
    id: topic.code,
    kind: "topic" as const,
    code: topic.code,
    title: topic.title,
    content: "",
    status: "verified" as const,
    identity: { boardId: "cambridge", qualificationId: "as", level: "as_level", syllabusId: "9702", syllabusVersion: "2025-2027", subjectId: "9702" },
    provenance: { authority: "Cambridge", sourceDocument: "spec.pdf", sourceUrl: "", retrievedAt: "2026-11-13", mappingStatus: "verified" as const },
    topicCode: topic.topicCode,
  })),
  knowledgeByKind: {
    topic: topics.map((topic) => ({
      id: topic.code,
      kind: "topic" as const,
      code: topic.code,
      title: topic.title,
      content: "",
      status: "verified" as const,
      identity: { boardId: "cambridge", qualificationId: "as", level: "as_level", syllabusId: "9702", syllabusVersion: "2025-2027", subjectId: "9702" },
      provenance: { authority: "Cambridge", sourceDocument: "spec.pdf", sourceUrl: "", retrievedAt: "2026-11-13", mappingStatus: "verified" as const },
      topicCode: topic.topicCode,
    })),
  },
});

describe("verified syllabus topic mapping", () => {
  it("maps an exact syllabus topic title to its canonical knowledge key", () => {
    expect(resolveVerifiedCurriculumTopic(curriculum([{ code: "9702.topic.8", title: "Superposition", topicCode: "8" }]), "Superposition"))
      .toEqual({ status: "matched", curriculumTopicKey: "9702.topic.8", title: "Superposition" });
  });

  it("does not fuzzy-match a similar but unverified label", () => {
    expect(resolveVerifiedCurriculumTopic(curriculum([{ code: "9702.topic.8", title: "Superposition" }]), "Superposition and waves"))
      .toEqual({ status: "unmapped", reason: "no-exact-match" });
  });

  it("fails closed when two syllabus records share an exact label", () => {
    expect(resolveVerifiedCurriculumTopic(curriculum([
      { code: "9702.topic.8", title: "Waves" },
      { code: "9702.topic.9", title: "Waves" },
    ]), "Waves")).toEqual({ status: "unmapped", reason: "ambiguous-match" });
  });

  it("does not map an unverified curriculum", () => {
    const unverified = curriculum([{ code: "9702.topic.8", title: "Superposition" }]);
    unverified.status = "unverified";
    expect(resolveVerifiedCurriculumTopic(unverified, "Superposition"))
      .toEqual({ status: "unmapped", reason: "curriculum-unverified" });
  });
});
