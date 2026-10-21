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
