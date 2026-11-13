import type { ImportedMarkingResource } from "./marking-resource-import";

export type MarkingResourceTextLine = {
  page: number;
  line: number;
  text: string;
};

export type MarkingResourceTextRegion = {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
};

export type MarkingResourceStructureMarker = {
  type: "question" | "subquestion" | "marks" | "marking_code" | "diagram_reference" | "table_hint";
  value: string;
  page: number;
  line: number;
};

export type MarkingResourceExtraction = {
  resourceId: string;
  contentSha256: string;
  format: "pdf" | "text" | "image" | "docx" | "unsupported";
  status: "extracted" | "needs_ocr" | "conversion_required" | "failed";
  pageCount: number | null;
  lines: MarkingResourceTextLine[];
  regions: MarkingResourceTextRegion[];
  markers: MarkingResourceStructureMarker[];
  warnings: string[];
  extractedAt: string;
  extractionEngine: string;
  textCharacterCount: number;
};

const MAX_EXTRACTED_CHARS = 1_500_000;
const QUESTION_RE = /^(?:Question\s+)?(\d{1,2})(?:\s*\(([a-zivx]+)\))?[.)]?\s+(.{2,})$/i;
const SUBQUESTION_RE = /^\(?([a-zivx]{1,4})\)?[.)]\s+(.{2,})$/i;
const MARKS_RE = /\[(\d+(?:\s*\+\s*\d+)*)\s*(?:marks?|mks?)\]/i;
const MARKING_CODE_RE = /\b(?:B\d|M\d|A\d|C\d|E\d|FT|cao|oe|ecf)\b/gi;
const DIAGRAM_RE = /\b(?:diagram|graph|sketch|figure|plot|circuit|label(?:led|ed)?)\b/i;
const TABLE_RE = /\b(?:table|results|readings|record your|column headings)\b/i;

function normalizePageText(page: number, text: string): MarkingResourceTextLine[] {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map(line => line.replace(/[\t\u00a0 ]+/g, " ").trim())
    .filter(Boolean)
    .map((line, index) => ({ page, line: index + 1, text: line }));
}

export function identifyMarkingStructure(lines: MarkingResourceTextLine[]): MarkingResourceStructureMarker[] {
  const markers: MarkingResourceStructureMarker[] = [];
  for (const item of lines) {
    const text = item.text;
    const question = text.match(QUESTION_RE);
    if (question) {
      markers.push({ type: question[2] ? "subquestion" : "question", value: question[0], page: item.page, line: item.line });
    } else {
      const subquestion = text.match(SUBQUESTION_RE);
      if (subquestion) markers.push({ type: "subquestion", value: subquestion[0], page: item.page, line: item.line });
    }
    const marks = text.match(MARKS_RE);
    if (marks) markers.push({ type: "marks", value: marks[0], page: item.page, line: item.line });
    const codes = text.match(MARKING_CODE_RE);
    if (codes) markers.push({ type: "marking_code", value: [...new Set(codes.map(code => code.toUpperCase()))].join(", "), page: item.page, line: item.line });
    if (DIAGRAM_RE.test(text)) markers.push({ type: "diagram_reference", value: text, page: item.page, line: item.line });
    if (TABLE_RE.test(text)) markers.push({ type: "table_hint", value: text, page: item.page, line: item.line });
  }
  return markers;
}

function result(
  resource: ImportedMarkingResource,
  values: Omit<MarkingResourceExtraction, "resourceId" | "contentSha256" | "extractedAt" | "textCharacterCount">,
): MarkingResourceExtraction {
  const lines = values.lines;
  return {
    ...values,
    resourceId: resource.id,
    contentSha256: resource.contentSha256 || "",
    extractedAt: new Date().toISOString(),
    textCharacterCount: lines.reduce((total, line) => total + line.text.length, 0),
  };
}

/**
 * Extracts searchable text while preserving page and line provenance.
 * This is not a mark-scheme interpreter: diagrams, handwriting and scanned pages
 * remain explicitly flagged for OCR/visual review.
 */
export async function extractImportedMarkingResource(
  resource: ImportedMarkingResource,
): Promise<MarkingResourceExtraction> {
  const extension = resource.fileName.split(".").pop()?.toLowerCase();
  const bytes = new Uint8Array(await resource.fileBlob.arrayBuffer());

  if (extension === "txt") {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes).slice(0, MAX_EXTRACTED_CHARS);
    const lines = normalizePageText(1, text);
    return result(resource, {
      format: "text",
      status: "extracted",
      pageCount: 1,
      lines,
      regions: [],
      markers: identifyMarkingStructure(lines),
      warnings: text.length >= MAX_EXTRACTED_CHARS ? ["Text was truncated at the extraction safety limit."] : [],
      extractionEngine: "shadecode-text-extractor-v1",
    });
  }

  if (extension === "pdf") {
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const loadingTask = pdfjs.getDocument({
        data: bytes,
        useSystemFonts: true,
        disableFontFace: true,
        verbosity: 0,
      });
      const document = await loadingTask.promise;
      const lines: MarkingResourceTextLine[] = [];
      const warnings: string[] = [];
      let totalChars = 0;
      const regions: MarkingResourceTextRegion[] = [];
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const buckets = new Map<number, string[]>();
        for (const item of textContent.items) {
          if (!("str" in item) || !item.str.trim()) continue;
          const x = Number(item.transform[4]) || 0;
          const y = Math.round((Number(item.transform[5]) || 0) / 2) * 2;
          const width = Number(item.width) || 0;
          const height = Math.abs(Number(item.height) || Number(item.transform[3]) || 0);
          const bucket = buckets.get(y) || [];
          bucket.push({ x, text: item.str });
          buckets.set(y, bucket);
          regions.push({ page: pageNumber, x, y, width, height, text: item.str });
        }
        const pageText = [...buckets.entries()]
          .sort((a, b) => b[0] - a[0])
          .map(([, parts]) => parts.sort((a, b) => a.x - b.x).map(part => part.text).join(" ").replace(/\s+/g, " ").trim())
          .filter(Boolean)
          .join("\n");
        if (!pageText.trim()) {
          warnings.push(`Page ${pageNumber} contains no extractable text. It may be scanned or image-based and needs OCR/visual review.`);
        }
        const pageLines = normalizePageText(pageNumber, pageText);
        for (const line of pageLines) {
          if (totalChars >= MAX_EXTRACTED_CHARS) break;
          const remaining = MAX_EXTRACTED_CHARS - totalChars;
          lines.push({ ...line, text: line.text.slice(0, remaining) });
          totalChars += line.text.length;
        }
        if (totalChars >= MAX_EXTRACTED_CHARS) {
          warnings.push("Document text was truncated at the extraction safety limit.");
          break;
        }
      }
      const markers = identifyMarkingStructure(lines);
      const markerPages = new Set(markers.map(marker => marker.page));
      if (document.numPages > 0 && markerPages.size === 0) {
        warnings.push("No reliable question or marking-structure anchors were detected. Review the page layout manually.");
      }
      warnings.push("PDF text extraction does not interpret diagrams, plotted graphs, handwriting, shading or visual mark annotations. Review those regions against the original pages.");
      return result(resource, {
        format: "pdf",
        status: warnings.some(warning => warning.includes("needs OCR")) ? "needs_ocr" : "extracted",
        pageCount: document.numPages,
        lines,
        markers,
        regions,
        warnings,
        extractionEngine: "pdfjs-dist-page-text-v1",
      });
    } catch (error) {
      return result(resource, {
        format: "pdf",
        status: "failed",
        pageCount: null,
        lines: [],
        markers: [],
        warnings: [error instanceof Error ? `PDF extraction failed: ${error.message}` : "PDF extraction failed."],
        extractionEngine: "pdfjs-dist-page-text-v1",
      });
    }
  }

  if (["jpg", "jpeg", "png", "webp"].includes(extension || "")) {
    return result(resource, {
      format: "image",
      status: "needs_ocr",
      pageCount: 1,
      lines: [],
      regions: [],
      markers: [],
      warnings: ["Image preserved. Run the platform's OCR/vision adapter and retain region coordinates before treating extracted text as evidence."],
      extractionEngine: "pending-platform-ocr",
    });
  }

  if (extension === "docx") {
    return result(resource, {
      format: "docx",
      status: "conversion_required",
      pageCount: null,
      lines: [],
      regions: [],
      markers: [],
      warnings: ["DOCX extraction is not yet enabled. Convert to PDF or TXT, or add a vetted DOCX parser before import into the marking-review pipeline."],
      extractionEngine: "docx-parser-not-configured",
    });
  }

  return result(resource, {
    format: "unsupported",
    status: "failed",
    pageCount: null,
    lines: [],
    regions: [],
    markers: [],
    warnings: ["Unsupported resource format."],
    extractionEngine: "none",
  });
}
