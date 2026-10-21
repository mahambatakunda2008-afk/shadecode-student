export type CoverageStatus = "verified" | "not_applicable" | "missing" | "partial" | string;

export interface CurriculumReadinessInput {
  versionStatus?: string | null;
  sourceDocumentId?: string | null;
  document?: {
    url?: string | null;
    contentHash?: string | null;
    contentCharacters?: number | null;
    extractedText?: string | null;
    extractionStatus?: string | null;
    status?: string | null;
  } | null;
  coverageChecks?: Array<{
    dimension: string;
    status: CoverageStatus;
    evidence?: unknown;
    notes?: string | null;
  }>;
  expectedCoverageDimensions?: number;
  objectiveCount?: number;
  verifiedObjectiveCount?: number;
  provenance?: Record<string, unknown> | null;
}

export interface CurriculumReadinessResult {
  ready: boolean;
  blockers: string[];
  warnings: string[];
  metrics: {
    extractedCharacters: number;
    coverageDimensionsRecorded: number;
    coverageDimensionsComplete: number;
    objectiveCount: number;
    verifiedObjectiveCount: number;
  };
}

/**
 * Conservative, read-only release gate. It intentionally does not change database
 * status fields. A URL, row status, or source-byte hash alone is not verification.
 */
export function evaluateCurriculumReadiness(input: CurriculumReadinessInput): CurriculumReadinessResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const doc = input.document ?? null;
  const text = typeof doc?.extractedText === "string" && doc.extractedText.trim() ? doc.extractedText : "";
  const extractedCharacters = text.length;
  const coverage = input.coverageChecks ?? [];
  const expected = input.expectedCoverageDimensions ?? 29;
  const dimensions = new Map<string, CoverageStatus>();
  const duplicateDimensions = new Set<string>();
  for (const row of coverage) {
    if (dimensions.has(row.dimension)) duplicateDimensions.add(row.dimension);
    dimensions.set(row.dimension, row.status);
  }
  const coverageDimensionsComplete = [...dimensions.values()].filter((status) => status === "verified" || status === "not_applicable").length;
  const objectiveCount = input.objectiveCount ?? 0;
  const verifiedObjectiveCount = input.verifiedObjectiveCount ?? 0;
  const provenance = input.provenance ?? {};

  if (!input.sourceDocumentId || !doc) blockers.push("No linked source document record.");
  if (!doc?.url) blockers.push("Source document URL is missing.");
  if (!doc?.contentHash || !/^[a-f0-9]{64}$/i.test(doc.contentHash)) {
    blockers.push("Source-byte fingerprint is missing, malformed, or explicitly uncomputed.");
  }
  if (!extractedCharacters) {
    blockers.push("No extracted source text is available; manual notes alone do not satisfy this automated evidence gate.");
  }
  if (doc && doc.contentCharacters !== extractedCharacters) {
    warnings.push("Stored character count does not match the available extracted text.");
  }
  if (coverage.length === 0) {
    blockers.push("No board-specific coverage checks are recorded.");
  } else {
    if (dimensions.size < expected) blockers.push(`Coverage inventory is incomplete: ${dimensions.size}/${expected} unique dimensions recorded.`);
    if (duplicateDimensions.size > 0) {
      blockers.push(`Coverage inventory contains duplicate dimension IDs: ${[...duplicateDimensions].sort().join(", ")}.`);
    }
    const missing = [...dimensions.entries()].filter(([, status]) => status !== "verified" && status !== "not_applicable");
    if (missing.length) blockers.push(`${missing.length} coverage dimension(s) are missing, partial, or unverified.`);
    for (const [dimension, status] of dimensions.entries()) {
      if (status === "not_applicable") {
        const rows = coverage.filter((item) => item.dimension === dimension);
        if (rows.some((row) => !row.notes?.trim() && !row.evidence)) {
          blockers.push(`Coverage dimension "${dimension}" is marked not_applicable without a visible rationale.`);
        }
      }
    }
  }
  if (!objectiveCount) blockers.push("No curriculum objectives are recorded.");
  if (objectiveCount > 0 && verifiedObjectiveCount < objectiveCount) {
    blockers.push(`Only ${verifiedObjectiveCount}/${objectiveCount} objectives are marked verified.`);
  }
  const verificationEvidence = typeof provenance.verificationEvidence === "string" && provenance.verificationEvidence.trim();
  const verificationMethod = typeof provenance.verificationMethod === "string" && provenance.verificationMethod.trim();
  const verificationDate = typeof provenance.wholeSyllabusVerifiedAt === "string" && provenance.wholeSyllabusVerifiedAt.trim()
    ? provenance.wholeSyllabusVerifiedAt
    : typeof provenance.verifiedAt === "string" && provenance.verifiedAt.trim() ? provenance.verifiedAt : "";
  if (!(provenance.wholeSyllabusVerified === true && verificationEvidence && verificationMethod && verificationDate)) {
    blockers.push("Whole-syllabus review evidence, method, and date are not all recorded.");
  }
  if (input.versionStatus !== "verified") warnings.push(`Stored curriculum version status is "${input.versionStatus ?? "unset"}"; readiness does not promote it automatically.`);
  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    metrics: {
      extractedCharacters,
      coverageDimensionsRecorded: dimensions.size,
      coverageDimensionsComplete,
      objectiveCount,
      verifiedObjectiveCount,
    },
  };
}
