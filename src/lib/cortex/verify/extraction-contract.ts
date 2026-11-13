export type VerifyExtractionResult = {
  rawText: string;
  confidence: number;
  warnings: string[];
};

export function validateVerifyExtraction(value: unknown): VerifyExtractionResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Image extraction did not return a structured object.");
  }
  const result = value as Record<string, unknown>;
  if (typeof result.rawText !== "string" || result.rawText.length > 120_000) {
    throw new Error("Image extraction returned invalid or oversized text.");
  }
  if (typeof result.confidence !== "number" || !Number.isFinite(result.confidence) ||
      result.confidence < 0 || result.confidence > 1) {
    throw new Error("Image extraction returned an invalid confidence value.");
  }
  if (!Array.isArray(result.warnings) ||
      !result.warnings.every((warning) => typeof warning === "string" && warning.length <= 300)) {
    throw new Error("Image extraction returned invalid warnings.");
  }
  return {
    rawText: result.rawText,
    confidence: result.confidence,
    warnings: result.warnings.slice(0, 20) as string[],
  };
}
