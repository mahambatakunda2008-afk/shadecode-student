export interface CurriculumDocumentEvidenceInput {
  previousHash?: string | null;
  incomingHash: string;
  previousStatus?: string | null;
  extractedText?: string | null;
}

export interface CurriculumDocumentEvidenceState {
  changed: boolean;
  documentStatus: "discovered" | "draft" | "verified" | "archived";
  extractedText: string | null;
  extractedCharacters: number;
  extractionSucceeded: boolean;
}

/**
 * A source hash change invalidates the prior verification state.
 * The extracted-character count is always derived from the text actually available,
 * never from a crawler's claimed character count.
 */
export function evaluateCurriculumDocumentEvidence(input: CurriculumDocumentEvidenceInput): CurriculumDocumentEvidenceState {
  const changed = !input.previousHash || input.previousHash !== input.incomingHash;
  const extractedText = typeof input.extractedText === "string" && input.extractedText.trim().length > 0
    ? input.extractedText
    : null;

  return {
    changed,
    documentStatus: changed
      ? "draft"
      : input.previousStatus === "verified" || input.previousStatus === "draft" || input.previousStatus === "archived"
        ? input.previousStatus
        : "discovered",
    extractedText,
    extractedCharacters: extractedText?.length ?? 0,
    extractionSucceeded: extractedText !== null,
  };
}
