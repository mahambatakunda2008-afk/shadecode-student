import type { SupabaseClient } from "@supabase/supabase-js";
import type { CurriculumVersionRequest } from "./version-resolver";
import {
  resolveDatabaseCurriculumVersion,
  type CurriculumVersionDatabaseRow,
  type DatabaseCurriculumResolution,
} from "./database-version-resolver";

type VersionRow = {
  id: string;
  board_id: string | null;
  qualification_id: string | null;
  subject_id: string | null;
  syllabus_id: string | null;
  syllabus_version: string | null;
  effective_from: string | null;
  effective_to: string | null;
  status: string | null;
  source_document_id: string;
  document_hash: string;
};

type DocumentRow = {
  id: string;
  url: string | null;
  content_hash: string | null;
  extraction_status: string | null;
  page_count: number | null;
  content_characters: number | null;
};

type CoverageRow = {
  curriculum_version_id: string;
  dimension: string;
  status: string;
};

/**
 * Read-only Supabase adapter for the exam-year resolver.
 *
 * Fetches all versions matching the exact curriculum identity, including drafts,
 * so an incomplete overlapping version cannot be hidden by a status filter.
 * This function never writes, promotes, or repairs curriculum records.
 */
export async function resolveCurriculumVersionFromDatabase(
  client: SupabaseClient,
  request: CurriculumVersionRequest,
): Promise<DatabaseCurriculumResolution> {
  if (request.routeId?.trim()) {
    // The current database schema has no authoritative route_id column.
    // Do not pretend route-specific resolution is supported.
    return resolveDatabaseCurriculumVersion(request, []);
  }

  const versionsResult = await client
    .from("curriculum_versions")
    .select("id, board_id, qualification_id, subject_id, syllabus_id, syllabus_version, effective_from, effective_to, status, source_document_id, document_hash")
    .eq("board_id", request.boardId.trim().toLowerCase())
    .eq("qualification_id", request.qualificationId.trim().toLowerCase())
    .eq("subject_id", request.subjectId.trim().toLowerCase());

  if (versionsResult.error) {
    throw new Error(`Could not read curriculum versions: ${versionsResult.error.message}`);
  }

  const versions = (versionsResult.data ?? []) as VersionRow[];
  if (versions.length === 0) {
    return resolveDatabaseCurriculumVersion(request, []);
  }

  const versionIds = versions.map((row) => row.id);
  const documentIds = [...new Set(versions.map((row) => row.source_document_id).filter(Boolean))];

  const [documentsResult, coverageResult] = await Promise.all([
    documentIds.length
      ? client
          .from("curriculum_documents")
          .select("id, url, content_hash, extraction_status, page_count, content_characters")
          .in("id", documentIds)
      : Promise.resolve({ data: [], error: null }),
    client
      .from("curriculum_coverage_checks")
      .select("curriculum_version_id, dimension, status")
      .in("curriculum_version_id", versionIds),
  ]);

  if (documentsResult.error) {
    throw new Error(`Could not read curriculum source documents: ${documentsResult.error.message}`);
  }
  if (coverageResult.error) {
    throw new Error(`Could not read curriculum coverage checks: ${coverageResult.error.message}`);
  }

  const documents = new Map(
    ((documentsResult.data ?? []) as DocumentRow[]).map((document) => [document.id, document]),
  );
  const coverageByVersion = new Map<string, CoverageRow[]>();
  for (const check of (coverageResult.data ?? []) as CoverageRow[]) {
    const existing = coverageByVersion.get(check.curriculum_version_id) ?? [];
    existing.push(check);
    coverageByVersion.set(check.curriculum_version_id, existing);
  }

  const rows: CurriculumVersionDatabaseRow[] = versions.map((version) => {
    const document = documents.get(version.source_document_id);
    const checks = coverageByVersion.get(version.id) ?? [];
    const fingerprintsMatch = Boolean(
      document?.content_hash &&
      version.document_hash &&
      document.content_hash.trim().toLowerCase() === version.document_hash.trim().toLowerCase(),
    );

    return {
      id: version.id,
      board_id: version.board_id,
      qualification_id: version.qualification_id,
      subject_id: version.subject_id,
      syllabus_id: version.syllabus_id,
      syllabus_version: version.syllabus_version,
      effective_from: version.effective_from,
      effective_to: version.effective_to,
      status: version.status,
      document: document
        ? {
            source_url: document.url,
            // A mismatch or placeholder in either stored fingerprint fails closed.
            document_hash: fingerprintsMatch ? document.content_hash : null,
            extraction_status: document.extraction_status,
            page_count: document.page_count,
            content_characters: document.content_characters,
          }
        : null,
      coverage_checks: checks.map(({ dimension, status }) => ({ dimension, status })),
    };
  });

  return resolveDatabaseCurriculumVersion(request, rows);
}
