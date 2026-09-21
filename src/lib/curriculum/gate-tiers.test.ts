import { describe, expect, it } from "vitest";
import { CURRICULUM_COMPLETENESS_DIMENSIONS, EXAM_HISTORY_DIMENSIONS, SYLLABUS_DIMENSIONS, requiredDimensionsForTier, type CurriculumCompletenessDimension } from "./completeness";
import type { CurriculumKnowledgeItem, CurriculumKnowledgeKind } from "./knowledge";
import { resolveCurriculumContext, type CurriculumCoverageRecord } from "./resolver";
import { resolveSystemCurriculum } from "./system-resolver";
import { buildSystemCurriculumContext, curriculumSystemPromptContext } from "./system-curriculum-context";

// Tiered gate: "exam" (default) needs all 29 coverage dimensions; "syllabus" needs the 25 that describe the
// syllabus itself and reports whether the 4 exam-history dimensions are verified, so consumers know which
// claims stay forbidden. Everything else in the gate is identical in both tiers.

const identity = { boardId: "cambridge", qualificationId: "cambridge-as-a-level", level: "a_level" as const, syllabusId: "cambridge-9702", syllabusVersion: "2025-2027", subjectId: "physics" };
const provenance = { authority: "Cambridge International", sourceDocument: "Physics 9702 syllabus 2025-2027", sourceUrl: "https://example.test/9702.pdf", retrievedAt: "2026-09-20", mappingStatus: "verified" as const, versionSource: "registry" as const };
const KINDS: CurriculumKnowledgeKind[] = ["topic", "content_scope", "competency", "skill", "progression", "assessment_requirement", "paper_component", "assessment_weighting", "examination_format", "practical_activity", "project_requirement", "terminology", "constraint", "guidance", "resource"];

const knowledge = (kinds: CurriculumKnowledgeKind[] = KINDS): CurriculumKnowledgeItem[] =>
  kinds.map((kind) => ({ id: `k-${kind}`, kind, title: kind, content: kind, status: "verified" as const, identity, provenance }));
const objective = { id: "o1", curriculum: identity, code: "3.3.3", statement: "Recall that in an elastic collision total kinetic energy is conserved.", status: "verified" as const, provenance };
// Open-ended dates so the tests never expire.
const version = { id: "v1", identity, status: "verified" as const, effectiveFrom: "2000-01-01", effectiveTo: null };
const learner = { ...identity };

const coverage = (overrides: Partial<Record<CurriculumCompletenessDimension, CurriculumCoverageRecord["status"]>> = {}): CurriculumCoverageRecord[] =>
  CURRICULUM_COMPLETENESS_DIMENSIONS.map((dimension) => ({ dimension, status: overrides[dimension] ?? "verified" }));
const withExamHistory = (status: CurriculumCoverageRecord["status"]) => Object.fromEntries(EXAM_HISTORY_DIMENSIONS.map((d) => [d, status])) as Partial<Record<CurriculumCompletenessDimension, CurriculumCoverageRecord["status"]>>;

const input = (coverageChecks: CurriculumCoverageRecord[], extra: Record<string, unknown> = {}) => ({
  learner, versions: [version], objectives: [objective], mappings: [], knowledge: knowledge(), coverageChecks, ...extra,
});

describe("coverage dimension tiers", () => {
  it("partition the 29 dimensions into 25 syllabus + 4 exam-history, disjoint", () => {
    expect([...EXAM_HISTORY_DIMENSIONS]).toEqual(["past_paper_coverage", "mark_scheme_coverage", "examiner_report_coverage", "grade_threshold_coverage"]);
    expect(SYLLABUS_DIMENSIONS).toHaveLength(25);
    expect(SYLLABUS_DIMENSIONS.some((d) => (EXAM_HISTORY_DIMENSIONS as readonly string[]).includes(d))).toBe(false);
    expect([...SYLLABUS_DIMENSIONS, ...EXAM_HISTORY_DIMENSIONS].sort()).toEqual([...CURRICULUM_COMPLETENESS_DIMENSIONS].sort());
    expect(requiredDimensionsForTier("exam")).toHaveLength(29);
    expect(requiredDimensionsForTier("syllabus")).toHaveLength(25);
  });
});

describe("resolveCurriculumContext tiers", () => {
  const examHistoryMissing = coverage(withExamHistory("missing"));

  it("keeps today's strict behaviour by default: exam-history gaps block everything", () => {
    const result = resolveCurriculumContext(input(examHistoryMissing));
    expect(result.status).toBe("unverified");
    for (const dimension of EXAM_HISTORY_DIMENSIONS) expect(result.reason).toContain(dimension);
    expect(result.objectives).toEqual([]);
  });

  it("the explicit exam tier is identical to the default", () => {
    expect(resolveCurriculumContext(input(examHistoryMissing, { tier: "exam" })).status).toBe("unverified");
  });

  it("the syllabus tier resolves with exam-history gaps and reports them", () => {
    const result = resolveCurriculumContext(input(examHistoryMissing, { tier: "syllabus" }));
    expect(result.status).toBe("resolved");
    expect(result.tier).toBe("syllabus");
    expect(result.examHistoryVerified).toBe(false);
    expect(result.examHistoryMissing).toEqual([...EXAM_HISTORY_DIMENSIONS]);
    expect(result.reason).toContain("Exam-history claims");
    expect(result.reason).toContain("remain blocked");
    expect(result.objectives).toHaveLength(1);
  });

  it("the syllabus tier is still blocked when ANY of the 25 syllabus dimensions is missing", () => {
    for (const dimension of SYLLABUS_DIMENSIONS) {
      const result = resolveCurriculumContext(input(coverage({ ...withExamHistory("verified"), [dimension]: "missing" }), { tier: "syllabus" }));
      expect(result.status, dimension).toBe("unverified");
      expect(result.reason, dimension).toContain(dimension);
    }
  });

  it("the syllabus tier does not accept draft or partial evidence for a syllabus dimension", () => {
    for (const status of ["draft", "discovered", "missing"] as const) {
      expect(resolveCurriculumContext(input(coverage({ objectives: status }), { tier: "syllabus" })).status, status).toBe("unverified");
    }
  });

  it("everything except exam-history coverage is enforced identically in the syllabus tier", () => {
    const base = { tier: "syllabus" as const };
    expect(resolveCurriculumContext(input(coverage(), { ...base, versions: [] })).status).toBe("unverified");
    expect(resolveCurriculumContext(input(coverage(), { ...base, versions: [{ ...version, status: "draft" as const }] })).status).toBe("unverified");
    expect(resolveCurriculumContext(input(coverage(), { ...base, knowledge: [] })).status).toBe("unverified");
    const missingKind = resolveCurriculumContext(input(coverage(), { ...base, knowledge: knowledge(KINDS.filter((k) => k !== "terminology")) }));
    expect(missingKind.status).toBe("unverified");
    expect(missingKind.reason).toContain("terminology");
    expect(resolveCurriculumContext(input(coverage(), { ...base, learner: { ...learner, subjectId: "" } })).status).toBe("unverified");
  });

  it("with all 29 verified, both tiers resolve and exam history is reported verified", () => {
    for (const tier of ["exam", "syllabus"] as const) {
      const result = resolveCurriculumContext(input(coverage(), { tier }));
      expect(result.status, tier).toBe("resolved");
      expect(result.examHistoryVerified, tier).toBe(true);
      expect(result.examHistoryMissing, tier).toEqual([]);
      expect(result.reason, tier).not.toContain("Exam-history claims");
    }
  });

  it("treats not_applicable exam-history dimensions as satisfied", () => {
    const result = resolveCurriculumContext(input(coverage(withExamHistory("not_applicable")), { tier: "syllabus" }));
    expect(result.examHistoryVerified).toBe(true);
  });
});

describe("system resolver and prompt guard", () => {
  it("the syllabus tier yields a context that forbids exam-history claims when they are unverified", () => {
    const result = resolveSystemCurriculum(input(coverage(withExamHistory("missing")), { tier: "syllabus" }) as never);
    expect(result.blocked).toBe(false);
    expect(result.context?.examHistoryVerified).toBe(false);
    const prompt = curriculumSystemPromptContext(result.context!);
    expect(prompt).toContain("NOT verified");
    expect(prompt).toContain("Do not cite specific past papers");
    expect(prompt).toContain("grade boundaries");
    expect(prompt).toContain("3.3.3: Recall that in an elastic collision");
  });

  it("does not add the guard when exam history is verified", () => {
    const result = resolveSystemCurriculum(input(coverage(), { tier: "syllabus" }) as never);
    expect(result.context?.examHistoryVerified).toBe(true);
    expect(curriculumSystemPromptContext(result.context!)).not.toContain("NOT verified");
  });

  it("stays blocked by default when exam history is unverified (opt-in only)", () => {
    const result = resolveSystemCurriculum(input(coverage(withExamHistory("missing"))) as never);
    expect(result.blocked).toBe(true);
    expect(result.context).toBeUndefined();
  });

  it("leaves prompts unchanged for contexts that do not assert the flag (backward compatible)", () => {
    const context = buildSystemCurriculumContext({ ...identity }, knowledge(), true, [objective]);
    expect(context.examHistoryVerified).toBeUndefined();
    expect(curriculumSystemPromptContext(context)).not.toContain("NOT verified");
  });
});
