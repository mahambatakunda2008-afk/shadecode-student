import { describe, expect, it } from "vitest";
import { SYLLABUS_DIMENSIONS } from "./completeness";
import {
  resolveDatabaseCurriculumVersion,
  type CurriculumVersionDatabaseRow,
} from "./database-version-resolver";

function validRow(overrides: Partial<CurriculumVersionDatabaseRow> = {}): CurriculumVersionDatabaseRow {
  return {
    id: "9701-2025-2027",
    board_id: "cambridge",
    qualification_id: "cambridge-as-a-level",
    subject_id: "chemistry",
    syllabus_id: "cambridge-9701",
    syllabus_version: "2025-2027",
    effective_from: "2025-01-01",
    effective_to: "2027-12-31",
    status: "verified",
    document: {
      source_url: "https://example.org/official-syllabus.pdf",
      document_hash: "sha256:abc123",
      extraction_status: "verified",
      page_count: 98,
      content_characters: 12000,
    },
    coverage_checks: SYLLABUS_DIMENSIONS.map((dimension) => ({
      dimension,
      status: "verified",
    })),
    ...overrides,
  };
}

const request = (examYear: number) => ({
  boardId: "cambridge",
  qualificationId: "cambridge-as-a-level",
  subjectId: "chemistry",
  examYear,
});

describe("resolveDatabaseCurriculumVersion", () => {
  it("selects the version matching the requested exam year", () => {
    const old = validRow();
    const next = validRow({
      id: "9701-2028-2030",
      syllabus_version: "2028-2030",
      effective_from: "2028-01-01",
      effective_to: "2030-12-31",
    });
    expect(resolveDatabaseCurriculumVersion(request(2026), [old, next]).resolution)
      .toMatchObject({ status: "resolved", version: { id: old.id } });
    expect(resolveDatabaseCurriculumVersion(request(2029), [old, next]).resolution)
      .toMatchObject({ status: "resolved", version: { id: next.id } });
  });

  it("blocks a version with a verified status but partial or empty source evidence", () => {
    const row = validRow({
      document: {
        source_url: "https://example.org/official-syllabus.pdf",
        document_hash: "sha256:abc123",
        extraction_status: "partial",
        page_count: 98,
        content_characters: 0,
      },
    });
    const result = resolveDatabaseCurriculumVersion(request(2026), [row]);
    expect(result.resolution.status).toBe("not_verified");
    expect(result.diagnostics[0].issues).toContain("source_extracted_content_empty");
    expect(result.diagnostics[0].issues).toContain("source_extraction_not_reviewable");
  });

  it("requires every syllabus coverage dimension to be verified or not applicable", () => {
    const row = validRow({ coverage_checks: [] });
    const result = resolveDatabaseCurriculumVersion(request(2026), [row]);
    expect(result.resolution).toMatchObject({ status: "not_verified" });
    expect(result.diagnostics[0].issues).toContain("coverage_identity_missing");
  });

  it("rejects incomplete year boundaries rather than guessing", () => {
    const row = validRow({ effective_from: null, effective_to: null });
    const result = resolveDatabaseCurriculumVersion(request(2026), [row]);
    expect(result.resolution.status).toBe("not_found");
    expect(result.diagnostics[0].issues).toContain("exam_year_range_not_explicit");
  });

  it("reports overlapping matching versions instead of picking one", () => {
    const old = validRow();
    const overlap = validRow({
      id: "overlap",
      syllabus_version: "2027-2029",
      effective_from: "2027-01-01",
      effective_to: "2029-12-31",
    });
    expect(resolveDatabaseCurriculumVersion(request(2027), [old, overlap]).resolution)
      .toMatchObject({ status: "ambiguous" });
  });

  it("does not hide a matching but incomplete version by filtering to verified status", () => {
    const draft = validRow({ status: "draft" });
    const result = resolveDatabaseCurriculumVersion(request(2026), [draft]);
    expect(result.resolution).toMatchObject({ status: "not_verified" });
    expect(result.diagnostics[0].issues).toContain("version_status_not_verified");
  });

  it("allows explicitly not-applicable syllabus dimensions but not missing dimensions", () => {
    const row = validRow({
      coverage_checks: SYLLABUS_DIMENSIONS.map((dimension, index) => ({
        dimension,
        status: index === 0 ? "not_applicable" : "verified",
      })),
    });
    expect(resolveDatabaseCurriculumVersion(request(2026), [row]).resolution.status).toBe("resolved");
  });
});
