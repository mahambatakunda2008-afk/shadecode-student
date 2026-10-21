import { SYLLABUS_DIMENSIONS, type CurriculumCompletenessDimension } from "./completeness";
import {
  resolveCurriculumVersion,
  type CurriculumVersionCandidate,
  type CurriculumVersionRequest,
  type CurriculumVersionResolution,
} from "./version-resolver";

export interface CurriculumVersionDatabaseRow {
  id: string;
  board_id: string | null;
  qualification_id: string | null;
  subject_id: string | null;
  syllabus_id: string | null;
  syllabus_version: string | null;
  effective_from: string | null;
  effective_to: string | null;
  status: string | null;
  document: {
    source_url: string | null;
    document_hash: string | null;
    extraction_status: string | null;
    page_count: number | null;
    content_characters: number | null;
  } | null;
  coverage_checks: Array<{
    dimension: string;
    status: string;
  }> | null;
}

export interface DatabaseCurriculumResolution {
  resolution: CurriculumVersionResolution;
  /** IDs included in the identity/year match, including candidates that fail trust gates. */
  matchedVersionIds: string[];
  /** Human-readable diagnostics for internal review and logging. */
  diagnostics: Array<{ versionId: string; issues: string[] }>;
}

function normalized(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/** Only full calendar-year boundaries can be converted to inclusive exam-year bounds. */
function fullCalendarYear(date: string | null | undefined, boundary: "start" | "end"): number | null {
  if (!date) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (boundary === "start" && (month !== 1 || day !== 1)) return null;
  if (boundary === "end" && (month !== 12 || day !== 31)) return null;
  return year >= 1900 && year <= 2200 ? year : null;
}

function trustIssues(row: CurriculumVersionDatabaseRow): string[] {
  const issues: string[] = [];
  if (normalized(row.status) !== "verified") issues.push("version_status_not_verified");
  if (!row.board_id || !row.qualification_id || !row.subject_id || !row.syllabus_id || !row.syllabus_version) {
    issues.push("incomplete_curriculum_identity");
  }

  const start = fullCalendarYear(row.effective_from, "start");
  const end = fullCalendarYear(row.effective_to, "end");
  if (start === null || end === null || start > end) issues.push("exam_year_range_not_explicit");

  const document = row.document;
  if (!document) {
    issues.push("source_document_missing");
  } else {
    if (!document.source_url) issues.push("source_url_missing");
    if (!document.document_hash) issues.push("source_document_hash_missing");
    if (!Number.isInteger(document.page_count) || (document.page_count ?? 0) < 1) issues.push("source_page_count_missing");
    if (!Number.isInteger(document.content_characters) || (document.content_characters ?? 0) < 1) {
      issues.push("source_extracted_content_empty");
    }
    if (!["verified", "manual"].includes(normalized(document.extraction_status))) {
      issues.push("source_extraction_not_reviewable");
    }
  }

  const checks = row.coverage_checks ?? [];
  const byDimension = new Map<string, string>();
  for (const check of checks) byDimension.set(check.dimension, normalized(check.status));
  for (const dimension of SYLLABUS_DIMENSIONS) {
    const status = byDimension.get(dimension);
    if (status !== "verified" && status !== "not_applicable") issues.push(`coverage_${dimension}_${status ?? "missing"}`);
  }

  return issues;
}

function toCandidate(row: CurriculumVersionDatabaseRow, issues: string[]): CurriculumVersionCandidate | null {
  const start = fullCalendarYear(row.effective_from, "start");
  const end = fullCalendarYear(row.effective_to, "end");
  if (
    !row.board_id || !row.qualification_id || !row.subject_id ||
    start === null || end === null || start > end
  ) return null;

  return {
    id: row.id,
    boardId: row.board_id,
    qualificationId: row.qualification_id,
    subjectId: row.subject_id,
    examYearStart: start,
    examYearEnd: end,
    complete: issues.length === 0,
    verified: issues.length === 0 && normalized(row.status) === "verified",
  };
}

/**
 * Converts explicitly joined database records into candidates for the pure
 * exam-year resolver. This function performs no database I/O and never treats
 * a version status or objective count alone as proof of completeness.
 *
 * Caller contract: fetch the version rows for the requested board,
 * qualification and subject, and join each row to its source document and
 * coverage checks. Pass the full candidate set so overlapping ranges are
 * detected rather than hidden by a status filter.
 */
export function resolveDatabaseCurriculumVersion(
  request: CurriculumVersionRequest,
  rows: readonly CurriculumVersionDatabaseRow[],
): DatabaseCurriculumResolution {
  const identityMatches = rows.filter((row) =>
    normalized(row.board_id) === normalized(request.boardId) &&
    normalized(row.qualification_id) === normalized(request.qualificationId) &&
    normalized(row.subject_id) === normalized(request.subjectId),
  );

  const diagnostics = identityMatches.map((row) => ({
    versionId: row.id,
    issues: trustIssues(row),
  }));

  const candidates = identityMatches
    .map((row) => toCandidate(row, trustIssues(row)))
    .filter((candidate): candidate is CurriculumVersionCandidate => candidate !== null);

  const resolution = resolveCurriculumVersion(request, candidates);
  return {
    resolution,
    matchedVersionIds: identityMatches.map((row) => row.id),
    diagnostics,
  };
}

/** Exported for callers that need to render coverage gaps without parsing strings. */
export function isSyllabusCoverageDimension(value: string): value is CurriculumCompletenessDimension {
  return (SYLLABUS_DIMENSIONS as readonly string[]).includes(value);
}
