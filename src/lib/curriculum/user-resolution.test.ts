import { beforeEach, describe, expect, it, vi } from "vitest";
import { CURRICULUM_COMPLETENESS_DIMENSIONS } from "./completeness";

vi.mock("server-only", () => ({}));

// Live column lists, taken from information_schema on the production database (2026-09-20).
// PostgREST rejects a filter on a column that does not exist, which is how the loader used to fail silently:
// curriculum_versions has NO `level`, and curriculum_objectives / curriculum_coverage_checks carry only
// `curriculum_version_id` (not the identity columns).
const LIVE_COLUMNS: Record<string, string[]> = {
  profiles: ["id", "curriculum_subjects"],
  curriculum_versions: ["id", "source_document_id", "board_id", "qualification_id", "syllabus_id", "syllabus_version", "subject_id", "effective_from", "effective_to", "status", "provenance", "document_hash"],
  curriculum_objectives: ["id", "curriculum_version_id", "objective_key", "parent_key", "topic", "title", "description", "education_level", "paper_component", "status", "provenance"],
  curriculum_coverage_checks: ["id", "curriculum_version_id", "dimension", "status", "evidence", "notes", "checked_at"],
  curriculum_knowledge: ["id", "curriculum_version_id", "source_document_id", "board_id", "qualification_id", "level", "syllabus_id", "syllabus_version", "subject_id", "paper_component_id", "kind", "knowledge_key", "title", "content", "parent_id", "topic_key", "objective_keys", "status", "provenance", "metadata"],
  objective_skill_mappings: ["id", "objective_id", "skill_id", "mapping_status", "rationale", "provenance"],
};

type Row = Record<string, unknown>;
let tables: Record<string, Row[]> = {};
let filterLog: Array<{ table: string; columns: string[] }> = [];
let profileRow: Row | null = null;

function query(table: string) {
  const eqs: Array<[string, unknown]> = [];
  const ins: Array<[string, unknown[]]> = [];
  const api: any = {
    select: () => api,
    eq: (column: string, value: unknown) => { eqs.push([column, value]); return api; },
    in: (column: string, values: unknown[]) => { ins.push([column, values]); return api; },
    maybeSingle: async () => ({ data: profileRow, error: null }),
    then: (resolve: (value: unknown) => unknown) => {
      const columns = [...eqs.map(([c]) => c), ...ins.map(([c]) => c)];
      filterLog.push({ table, columns });
      const missing = columns.find((c) => !LIVE_COLUMNS[table]?.includes(c));
      if (missing) return resolve({ data: null, error: { message: `column ${table}.${missing} does not exist` } });
      const data = (tables[table] ?? []).filter((row) => eqs.every(([c, v]) => row[c] === v) && ins.every(([c, vs]) => vs.includes(row[c])));
      return resolve({ data, error: null });
    },
  };
  return api;
}

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ from: (table: string) => query(table) }) }));

const IDENTITY = { boardId: "cambridge", qualificationId: "cambridge-as-a-level", level: "a_level", syllabusId: "cambridge-9709", syllabusVersion: "2026-2027", subjectId: "mathematics", subjectName: "Mathematics" };
const KINDS = ["topic", "content_scope", "competency", "skill", "progression", "assessment_requirement", "paper_component", "assessment_weighting", "examination_format", "practical_activity", "project_requirement", "terminology", "constraint", "guidance", "resource"];

function seedComplete() {
  profileRow = { curriculum_subjects: [IDENTITY] };
  tables = {
    // Effective dates are open-ended so this test never expires.
    curriculum_versions: [{ id: "v1", board_id: "cambridge", qualification_id: "cambridge-as-a-level", syllabus_id: "cambridge-9709", syllabus_version: "2026-2027", subject_id: "mathematics", status: "verified", effective_from: "2000-01-01", effective_to: null }],
    curriculum_objectives: [
      { id: "o1", curriculum_version_id: "v1", objective_key: "1.1.1", description: "Complete the square for ax² + bx + c and use the completed-square form.", title: "Quadratics", status: "verified", paper_component: null, provenance: {} },
      { id: "o2", curriculum_version_id: "v1", objective_key: "1.1.2", description: "Find and use the discriminant of a quadratic.", title: "Quadratics", status: "verified", paper_component: null, provenance: {} },
    ],
    curriculum_coverage_checks: CURRICULUM_COMPLETENESS_DIMENSIONS.map((dimension, i) => ({ id: `c${i}`, curriculum_version_id: "v1", dimension, status: "verified" })),
    curriculum_knowledge: KINDS.map((kind, i) => ({ id: `k${i}`, curriculum_version_id: "v1", board_id: "cambridge", qualification_id: "cambridge-as-a-level", level: "a_level", syllabus_id: "cambridge-9709", syllabus_version: "2026-2027", subject_id: "mathematics", kind, title: kind, content: kind, status: "verified", provenance: { mappingStatus: "verified" } })),
    objective_skill_mappings: [],
  };
}

describe("resolveUserSystemCurriculum", () => {
  beforeEach(() => { filterLog = []; seedComplete(); });

  it("only filters on columns that exist in the live schema (no `level` on versions, no identity columns on objectives)", async () => {
    const { resolveUserSystemCurriculum } = await import("./user-resolution");
    const result = await resolveUserSystemCurriculum("user-1", "mathematics");
    // Regression: these filters used to error against the real tables, blocking every learner with
    // "Unable to load the verified curriculum knowledge".
    expect(result.reason ?? "").not.toContain("Unable to load");
    const used = (table: string) => filterLog.filter((f) => f.table === table).flatMap((f) => f.columns);
    expect(used("curriculum_versions")).not.toContain("level");
    expect(used("curriculum_objectives")).toEqual(["curriculum_version_id"]);
    expect(used("curriculum_coverage_checks")).toEqual(["curriculum_version_id"]);
    expect(used("curriculum_knowledge")).toContain("level");
  });

  it("resolves a fully verified syllabus and returns the outcome sentences as the grounding statements", async () => {
    const { resolveUserSystemCurriculum } = await import("./user-resolution");
    const result = await resolveUserSystemCurriculum("user-1", "mathematics");
    expect(result.blocked).toBe(false);
    expect(result.context?.objectives.map((o) => o.statement)).toEqual([
      "Complete the square for ax² + bx + c and use the completed-square form.",
      "Find and use the discriminant of a quadratic.",
    ]);
  });

  it("resolves when only the four exam-history dimensions are missing, and forbids exam-history claims", async () => {
    const examHistory = ["past_paper_coverage", "mark_scheme_coverage", "examiner_report_coverage", "grade_threshold_coverage"];
    tables.curriculum_coverage_checks = tables.curriculum_coverage_checks.filter((row) => !examHistory.includes(String(row.dimension)));
    const { resolveUserSystemCurriculum } = await import("./user-resolution");
    const result = await resolveUserSystemCurriculum("user-1", "mathematics");
    expect(result.blocked).toBe(false);
    expect(result.context?.examHistoryVerified).toBe(false);
    const { curriculumSystemPromptContext } = await import("./system-curriculum-context");
    expect(curriculumSystemPromptContext(result.context!)).toContain("Do not cite specific past papers");
  });

  it("still blocks when a syllabus (non exam-history) dimension is missing", async () => {
    tables.curriculum_coverage_checks = tables.curriculum_coverage_checks.filter((row) => row.dimension !== "terminology");
    const { resolveUserSystemCurriculum } = await import("./user-resolution");
    const result = await resolveUserSystemCurriculum("user-1", "mathematics");
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain("terminology");
  });

  it("stays blocked when coverage evidence is missing (coverage is actually loaded and enforced)", async () => {
    tables.curriculum_coverage_checks = [];
    const { resolveUserSystemCurriculum } = await import("./user-resolution");
    const result = await resolveUserSystemCurriculum("user-1", "mathematics");
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain("coverage is incomplete");
  });

  it("stays blocked when one coverage dimension is only a draft", async () => {
    tables.curriculum_coverage_checks[0] = { ...tables.curriculum_coverage_checks[0], status: "draft" };
    const { resolveUserSystemCurriculum } = await import("./user-resolution");
    expect((await resolveUserSystemCurriculum("user-1", "mathematics")).blocked).toBe(true);
  });

  it("stays blocked when a required knowledge layer is missing", async () => {
    tables.curriculum_knowledge = tables.curriculum_knowledge.filter((row) => row.kind !== "terminology");
    const { resolveUserSystemCurriculum } = await import("./user-resolution");
    const result = await resolveUserSystemCurriculum("user-1", "mathematics");
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain("terminology");
  });

  it("blocks when no verified curriculum version matches the learner's identity", async () => {
    tables.curriculum_versions = [];
    const { resolveUserSystemCurriculum } = await import("./user-resolution");
    const result = await resolveUserSystemCurriculum("user-1", "mathematics");
    expect(result.blocked).toBe(true);
    expect(result.reason ?? "").not.toContain("Unable to load");
  });

  it("blocks with a clear reason when the learner has no stored curriculum identity", async () => {
    profileRow = { curriculum_subjects: [] };
    const { resolveUserSystemCurriculum } = await import("./user-resolution");
    const result = await resolveUserSystemCurriculum("user-1", "mathematics");
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain("No exact curriculum profile");
  });
});
