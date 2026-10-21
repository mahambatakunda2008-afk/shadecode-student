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
