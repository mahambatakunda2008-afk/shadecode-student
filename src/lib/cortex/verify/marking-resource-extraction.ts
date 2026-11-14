import type { ImportedMarkingResource } from "./marking-resource-import";
import { extractDocxText } from "./docx-extraction";

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
const MAX_EXTRACTED_REGIONS = 100_000;
const QUESTION_RE = /^(?:Question\s+)?(\d{1,2})(?:\s*\(([a-zivx]+)\))?[.)]?\s+(.{2,})$/i;
const SUBQUESTION_RE = /^\(?([a-zivx]{1,4})\)?[.)]\s+(.{2,})$/i;
const MARKS_RE = /\[(\d+(?:\s*\+\s*\d+)*)\s*(?:marks?|mks?)\]/i;
const MARKING_CODE_RE = /\b(?:B\d|M\d|A\d|C\d|E\d|FT|cao|oe|ecf)\b/gi;
const DIAGRAM_RE = /\b(?:diagram|graph|sketch|figure|plot|circuit|label(?:led|ed)?)\b/i;
const TABLE_RE = /\b(?:table|results|readings|record your|column headings)\b/i;


export type PdfTextLayoutItem = { x: number; width: number; text: string };

/** Reconstructs text order while retaining likely column boundaries as tabs. */
export function joinPdfTextItemsByLayout(items: PdfTextLayoutItem[]): string {
  const ordered = [...items].filter(item => item.text.trim()).sort((a, b) => a.x - b.x);
  if (!ordered.length) return "";
  const characterWidths = ordered
    .filter(item => item.width > 0 && item.text.length > 0)
    .map(item => item.width / item.text.length)
    .sort((a, b) => a - b);
  const medianCharacterWidth = characterWidths.length
    ? characterWidths[Math.floor(characterWidths.length / 2)]
    : 4;
  const columnGap = Math.max(18, medianCharacterWidth * 4);
  let output = ordered[0].text.trim();
  let previous = ordered[0];
  for (const item of ordered.slice(1)) {
    const gap = item.x - (previous.x + Math.max(0, previous.width));
    output += gap >= columnGap ? "\\t" : " ";
    output += item.text.trim();
    previous = item;
  }
  return output.replace(/[ ]{2,}/g, " ").trim();
}

export type PdfPageSelection = { pages: number[]; error: null } | { pages: []; error: string };

/** Parse and validate a user-selected PDF OCR batch before rendering any pages. */
export function parsePdfPageSelection(input: string, pageCount: number): PdfPageSelection {
  const tokens = input.split(",").map(value => value.trim());
  if (!input.trim() || tokens.some(token => !/^\d+$/.test(token))) {
    return { pages: [], error: "Enter whole PDF page numbers separated by commas, for example: 2, 4, 7." };
  }
  const pages = tokens.map(Number);
  if (!Number.isInteger(pageCount) || pageCount < 1 || pages.some(page => page < 1 || page > pageCount)) {
    return { pages: [], error: `Choose pages from 1 to ${Math.max(0, pageCount)} for this PDF.` };
  }
  if (new Set(pages).size !== pages.length) {
    return { pages: [], error: "Each PDF page can appear only once in a batch." };
  }
  if (pages.length > 20) {
    return { pages: [], error: "Choose no more than 20 pages per local OCR batch." };
  }
  return { pages, error: null };
}

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
    if (TABLE_RE.test(text) || text.includes("\\t")) markers.push({ type: "table_hint", value: text, page: item.page, line: item.line });
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
      let regionsTruncated = false;
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const buckets = new Map<number, PdfTextLayoutItem[]>();
        for (const item of textContent.items) {
          if (!("str" in item) || !item.str.trim()) continue;
          const x = Number(item.transform[4]) || 0;
          const y = Math.round((Number(item.transform[5]) || 0) / 2) * 2;
          const width = Number(item.width) || 0;
          const height = Math.abs(Number(item.height) || Number(item.transform[3]) || 0);
          const bucket = buckets.get(y) || [];
          bucket.push({ x, width, text: item.str });
          buckets.set(y, bucket);
          if (regions.length < MAX_EXTRACTED_REGIONS) {
            regions.push({ page: pageNumber, x, y, width, height, text: item.str });
          } else {
            regionsTruncated = true;
          }
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
      if (regionsTruncated) {
        warnings.push(`Text-region coordinates were capped at ${MAX_EXTRACTED_REGIONS.toLocaleString()} items for memory safety. Some later regions are not available for precise visual alignment.`);
      }
      warnings.push("PDF text extraction does not interpret diagrams, plotted graphs, handwriting, shading or visual mark annotations. Review those regions against the original pages.");
      warnings.push("Wide horizontal gaps between PDF text fragments are retained as tab-separated layout hints. These are heuristic column boundaries, not a reconstructed table; verify them against the page preview.");
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
        regions: [],
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
    try {
      const extracted = await extractDocxText(resource.fileBlob);
      const lines = normalizePageText(1, extracted.text);
      const visualWarnings = [
        extracted.imageCount > 0 ? `DOCX contains ${extracted.imageCount} embedded image reference(s). Images are not extracted or interpreted; inspect the original document.` : null,
        extracted.chartCount > 0 ? `DOCX contains ${extracted.chartCount} chart reference(s). Chart data and axes are not extracted; inspect the original document.` : null,
        extracted.tableCount > 0 ? `DOCX contains ${extracted.tableCount} table(s). Cell text is preserved as rows, but merged cells, layout, borders and visual meaning require source review.` : null,
      ].filter((warning): warning is string => Boolean(warning));
      return result(resource, {
        format: "docx",
        status: "extracted",
        pageCount: null,
        lines,
        regions: [],
        markers: identifyMarkingStructure(lines),
        warnings: [
          "DOCX paragraph text was extracted locally. Original Word page layout, floating objects, equations, comments and visual positioning are not preserved; review the source document before using this text as evidence.",
          ...visualWarnings,
          "DOCX text extraction does not establish copyright permissions, authenticity or marking-scheme validity.",
        ],
        extractionEngine: extracted.engine,
      });
    } catch (error) {
      return result(resource, {
        format: "docx",
        status: "failed",
        pageCount: null,
        lines: [],
        regions: [],
        markers: [],
        warnings: [error instanceof Error ? `DOCX extraction failed: ${error.message}` : "DOCX extraction failed."],
        extractionEngine: "shadecode-docx-wordprocessingml-v1",
      });
    }
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
