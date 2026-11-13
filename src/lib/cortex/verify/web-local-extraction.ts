import { validateLocalVerifyExtraction, type LocalVerifyExtraction } from "./local-extraction-contract";

type BrowserTextBlock = {
  rawValue?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
};

type BrowserTextDetector = {
  detect(source: ImageBitmap): Promise<BrowserTextBlock[]>;
};

type BrowserTextDetectorConstructor = new () => BrowserTextDetector;

function detectorConstructor(): BrowserTextDetectorConstructor | null {
  if (typeof window === "undefined") return null;
  const candidate = (window as unknown as { TextDetector?: BrowserTextDetectorConstructor }).TextDetector;
  return typeof candidate === "function" ? candidate : null;
}

/** True only when this browser exposes its experimental on-device TextDetector API. */
export function isBrowserLocalOcrAvailable(): boolean {
  return detectorConstructor() !== null && typeof createImageBitmap === "function";
}

/**
 * Runs the browser's native TextDetector locally. No image is uploaded.
 * This API is experimental and is not available in every browser. It does not
 * expose confidence scores, so this adapter deliberately reports confidence=null.
 */
export async function extractImageLocally(image: Blob): Promise<LocalVerifyExtraction> {
  const Detector = detectorConstructor();
  if (!Detector || typeof createImageBitmap !== "function") {
    throw new Error("Local OCR is not supported by this browser yet. Your image remains on this device; use an installed Android OCR engine or choose the consent-based cloud option.");
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(image);
    const detections = await new Detector().detect(bitmap);
    const regions = detections
      .map((item, index) => {
        const text = typeof item.rawValue === "string" ? item.rawValue.trim() : "";
        const box = item.boundingBox;
        if (!text || !box || bitmap!.width <= 0 || bitmap!.height <= 0) return null;
        const x = Math.max(0, Math.min(1, box.x / bitmap!.width));
        const y = Math.max(0, Math.min(1, box.y / bitmap!.height));
        const right = Math.max(x, Math.min(1, (box.x + box.width) / bitmap!.width));
        const bottom = Math.max(y, Math.min(1, (box.y + box.height) / bitmap!.height));
        if (right <= x || bottom <= y) return null;
        return {
          id: `page-0-region-${index}`,
          page: 0,
          bounds: { x, y, width: right - x, height: bottom - y },
          text,
        };
      })
      .filter((region): region is NonNullable<typeof region> => region !== null)
      .sort((a, b) => a.bounds.y - b.bounds.y || a.bounds.x - b.bounds.x);

    const rawText = regions.map((region) => region.text).join("\\n");
    const warnings = [
      "The browser OCR API does not provide a confidence score.",
      "This experimental browser engine may be unavailable or behave differently across devices.",
      "Handwriting, mathematical notation, tables, graphs and diagrams may be misread or omitted. Review the original image.",
    ];
    if (regions.length === 0) warnings.unshift("No readable text regions were detected. This does not mean the image is blank.");

    return validateLocalVerifyExtraction({
      rawText,
      confidence: null,
      warnings,
      platform: "web",
      engine: "Browser TextDetector API",
      regions,
    });
  } catch (error) {
    if (error instanceof Error && /Local OCR is not supported/.test(error.message)) throw error;
    throw new Error(error instanceof Error ? `Local OCR failed: ${error.message}` : "Local OCR failed. The original image is unchanged.");
  } finally {
    bitmap?.close();
  }
}
