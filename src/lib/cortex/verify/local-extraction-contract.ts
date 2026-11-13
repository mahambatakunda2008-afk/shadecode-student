/**
 * Shared platform-neutral contract for SNAP & EXTRACT inside Cortex Verify.
 * Native/web/desktop OCR adapters must normalize their output through this
 * boundary before persisting or forwarding it to Mark Mode or Help Mode.
 *
 * This contract validates OCR text and provenance metadata. It does not claim
 * semantic understanding of equations, tables, graphs or diagrams.
 */
export type VerifyExtractionPlatform = "web" | "android" | "desktop";

export type VerifyExtractionRegion = {
  id: string;
  page: number;
  /** Normalized coordinates in the inclusive range 0..1. */
  bounds: { x: number; y: number; width: number; height: number };
  text: string;
  confidence?: number;
};

export type LocalVerifyExtraction = {
  rawText: string;
  confidence: number;
  warnings: string[];
  platform: VerifyExtractionPlatform;
  engine: string;
  engineVersion?: string;
  language?: string;
  regions: VerifyExtractionRegion[];
  execution: "local";
  sourceStored: false;
};

const MAX_TEXT_LENGTH = 120_000;
const MAX_WARNINGS = 20;
const MAX_REGIONS = 2_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validConfidence(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

/** Strictly validate a platform adapter's OCR result without modifying source text. */
export function validateLocalVerifyExtraction(value: unknown): LocalVerifyExtraction {
  if (!isRecord(value)) throw new Error("Local extraction returned an invalid result.");
  if (typeof value.rawText !== "string" || value.rawText.length > MAX_TEXT_LENGTH) {
    throw new Error("Local extraction returned missing or oversized text.");
  }
  if (!validConfidence(value.confidence)) {
    throw new Error("Local extraction returned an invalid confidence value.");
  }
  if (!Array.isArray(value.warnings) ||
      !value.warnings.every((item) => typeof item === "string" && item.length <= 300)) {
    throw new Error("Local extraction returned invalid warnings.");
  }
  if (!["web", "android", "desktop"].includes(String(value.platform))) {
    throw new Error("Local extraction reported an unsupported platform.");
  }
  if (typeof value.engine !== "string" || !value.engine.trim() || value.engine.length > 100) {
    throw new Error("Local extraction must identify its OCR engine.");
  }
  if (value.engineVersion !== undefined &&
      (typeof value.engineVersion !== "string" || value.engineVersion.length > 60)) {
    throw new Error("Local extraction reported an invalid engine version.");
  }
  if (value.language !== undefined &&
      (typeof value.language !== "string" || value.language.length > 35)) {
    throw new Error("Local extraction reported an invalid language.");
  }
  if (!Array.isArray(value.regions) || value.regions.length > MAX_REGIONS) {
    throw new Error("Local extraction returned invalid source regions.");
  }

  const regions = value.regions.map((region, index): VerifyExtractionRegion => {
    if (!isRecord(region) || typeof region.id !== "string" || !region.id.trim() ||
        region.id.length > 100 || !Number.isInteger(region.page) || (region.page as number) < 0 ||
        typeof region.text !== "string" || region.text.length > MAX_TEXT_LENGTH ||
        !isRecord(region.bounds)) {
      throw new Error(`Local extraction returned an invalid source region at index ${index}.`);
    }
    const { x, y, width, height } = region.bounds;
    if (![x, y, width, height].every((n) => typeof n === "number" && Number.isFinite(n)) ||
        (x as number) < 0 || (y as number) < 0 || (width as number) <= 0 ||
        (height as number) <= 0 || (x as number) + (width as number) > 1.000001 ||
        (y as number) + (height as number) > 1.000001) {
      throw new Error(`Local extraction returned invalid bounds for region ${index}.`);
    }
    if (region.confidence !== undefined && !validConfidence(region.confidence)) {
      throw new Error(`Local extraction returned invalid confidence for region ${index}.`);
    }
    return {
      id: region.id,
      page: region.page as number,
      bounds: { x: x as number, y: y as number, width: width as number, height: height as number },
      text: region.text,
      ...(region.confidence === undefined ? {} : { confidence: region.confidence as number }),
    };
  });

  return {
    rawText: value.rawText,
    confidence: value.confidence,
    warnings: (value.warnings as string[]).slice(0, MAX_WARNINGS),
    platform: value.platform as VerifyExtractionPlatform,
    engine: value.engine.trim(),
    ...(value.engineVersion === undefined ? {} : { engineVersion: value.engineVersion as string }),
    ...(value.language === undefined ? {} : { language: value.language as string }),
    regions,
    execution: "local",
    sourceStored: false,
  };
}
