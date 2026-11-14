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

    const rawText = regions.map((region) => region.text).join("\n");
    const warnings = [
      "The browser OCR API does not provide a confidence score.",
      "This experimental browser engine may be unavailable or behave differently across devices.",
      "Handwriting, mathematical notation, tables, graphs and diagrams may be misread or omitted. Review the original image.",
    ];
    if (regions.length === 0) warnings.unshift("No readable text regions were detected. This does not mean the image is blank.");

    return validateLocalVerifyExtraction({
      rawText: rawText.slice(0, 120_000),
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


/**
 * Renders selected scanned PDF pages locally, then runs the same browser OCR
 * adapter used for images. Pages are processed sequentially to limit memory.
 * Page numbers in returned regions are 1-based and refer to the source PDF.
 */
export async function extractPdfPagesLocally(
  pdf: Blob,
  pageNumbers: number[],
): Promise<LocalVerifyExtraction> {
  if (!isBrowserLocalOcrAvailable()) {
    throw new Error("Local PDF OCR is not supported by this browser. The PDF remains on this device; no cloud OCR was started.");
  }
  if (!pageNumbers.length || pageNumbers.length > 20 ||
      pageNumbers.some(page => !Number.isInteger(page) || page < 1) ||
      new Set(pageNumbers).size !== pageNumbers.length) {
    throw new Error("Choose between 1 and 20 unique, valid PDF page numbers per local OCR batch.");
  }

  let destroyDocument: (() => Promise<void>) | null = null;
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(await pdf.arrayBuffer()),
      useSystemFonts: true,
      disableFontFace: true,
      verbosity: 0,
    });
    const document = await loadingTask.promise;
    destroyDocument = () => loadingTask.destroy();
    const allRegions: LocalVerifyExtraction["regions"] = [];
    const warnings: string[] = [
      "PDF pages were rendered and OCRed locally in this browser. No PDF or page image was uploaded.",
      "OCR text is an aid, not verified evidence. Check every region against the original PDF page.",
      "Handwriting, equations, tables, graphs, diagrams and symbols may be omitted or misread.",
    ];

    for (const pageNumber of pageNumbers) {
      if (pageNumber > document.numPages) {
        throw new Error(`PDF page ${pageNumber} does not exist. This document has ${document.numPages} pages.`);
      }
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: Math.min(2, 1600 / Math.max(page.view[2] - page.view[0], page.view[3] - page.view[1])) });
      const canvas = window.document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("This browser could not create a local PDF rendering canvas.");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      try {
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        const pageImage = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error(`Could not render PDF page ${pageNumber} for local OCR.`)), "image/png");
        });
        const pageResult = await extractImageLocally(pageImage);
        for (const region of pageResult.regions) {
          if (allRegions.length >= 2_000) {
            warnings.push("OCR regions were capped at 2,000 for memory safety. Process fewer pages per batch for more detailed region review.");
            break;
          }
          allRegions.push({
            ...region,
            id: `pdf-page-${pageNumber}-region-${allRegions.length}`,
            page: pageNumber,
          });
        }
        warnings.push(...pageResult.warnings);
      } finally {
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
      }
    }

    if (!allRegions.length) warnings.unshift("No readable text regions were detected on the selected pages. Review the original PDF visually.");
    const rawText = pageNumbers.map(page => {
      const pageRegions = allRegions.filter(region => region.page === page);
      return pageRegions.length ? `[Page ${page}]\n${pageRegions.map(region => region.text).join("\n")}` : `[Page ${page}]\n[No text detected]`;
    }).join("\n\n");

    return validateLocalVerifyExtraction({
      rawText,
      confidence: null,
      warnings: [...new Set(warnings)].slice(0, 20),
      platform: "web",
      engine: "PDF.js render + Browser TextDetector API",
      regions: allRegions,
    });
  } catch (error) {
    throw new Error(error instanceof Error ? `Local PDF OCR failed: ${error.message}` : "Local PDF OCR failed. The original PDF is unchanged.");
  } finally {
    if (destroyDocument) await destroyDocument();
  }
}
