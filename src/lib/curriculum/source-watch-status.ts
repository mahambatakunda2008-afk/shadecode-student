export type CurriculumWatchedDocumentStatus = "extracted" | "discovered" | "extraction-empty" | "extraction-failed";

export type CurriculumWatchStatus = "ok" | "partial" | "failed" | "no_documents";

/** A landing page being reachable is not a successful syllabus-document ingestion. */
export function summarizeCurriculumWatchStatus(statuses: CurriculumWatchedDocumentStatus[]): CurriculumWatchStatus {
  if (statuses.length === 0) return "no_documents";
  const successes = statuses.filter((status) => status === "extracted" || status === "discovered").length;
  const failures = statuses.length - successes;
  if (failures === 0) return "ok";
  return successes > 0 ? "partial" : "failed";
}

export type CurriculumIngestionRunStatus = "completed" | "partial" | "failed";

/** The ingestion process can finish executing while the source ingestion itself fails. */
export function resolveCurriculumIngestionRunStatus(sourceStatus: string | null | undefined, extractionSkipped: number): CurriculumIngestionRunStatus {
  if (sourceStatus === "ok" && extractionSkipped === 0) return "completed";
  if (sourceStatus === "partial" || (sourceStatus === "ok" && extractionSkipped > 0)) return "partial";
  return "failed";
}

/** A configured syllabus version is authoritative; disagreement must block ingestion. */
export function hasCurriculumVersionConflict(configuredVersion: string | null | undefined, discoveredVersion: string | null | undefined): boolean {
  return Boolean(configuredVersion && discoveredVersion && configuredVersion !== discoveredVersion);
}

export interface WatchedSyllabusVersion {
  version: string | null;
  source: "document" | "registry" | "unresolved";
  confidence: string;
  evidence: string[];
}

/**
 * Keep the version discovered inside the official PDF separate from the
 * registry's expected version. Ingestion needs both values to detect a
 * mismatch and fail closed instead of silently labelling a new PDF as old.
 */
export function resolveWatchedSyllabusVersion(input: {
  configuredVersion?: string | null;
  discoveredVersion?: string | null;
  discoveryConfidence?: string | null;
  discoveryEvidence?: string[];
}): WatchedSyllabusVersion {
  if (input.discoveredVersion) {
    return {
      version: input.discoveredVersion,
      source: "document",
      confidence: input.discoveryConfidence ?? "unknown",
      evidence: input.discoveryEvidence ?? [],
    };
  }
  if (input.configuredVersion) {
    return {
      version: input.configuredVersion,
      source: "registry",
      confidence: "high",
      evidence: ["Source registry explicitly configured this syllabus version."],
    };
  }
  return {
    version: null,
    source: "unresolved",
    confidence: input.discoveryConfidence ?? "unresolved",
    evidence: input.discoveryEvidence ?? [],
  };
}

export type CurriculumExtractionSkipReason = "version_conflict" | "missing_curriculum" | "missing_extracted_text" | null;

/**
 * Centralise the extraction gate so a syllabus-version mismatch is checked
 * before missing-text handling. Version conflicts must be recorded even when
 * PDF text extraction failed.
 */
export function resolveCurriculumExtractionSkipReason(input: {
  curriculumResolved: boolean;
  versionConflict: boolean;
  extractedText?: string | null;
}): CurriculumExtractionSkipReason {
  if (!input.curriculumResolved) return "missing_curriculum";
  if (input.versionConflict) return "version_conflict";
  if (typeof input.extractedText !== "string" || !input.extractedText.trim()) return "missing_extracted_text";
  return null;
}
