import { createHash } from "node:crypto";

export type PaperPage = {
  pageNumber: number;
  text: string;
  textHash: string;
};

export type PaperQuestion = {
  questionNumber: string;
  sourcePageStart: number;
  sourcePageEnd: number;
  questionText: string;
  extractionMethod: string;
  extractionConfidence: number;
  marks: number | null;
};

function hashText(text: string) {
  return createHash("sha256").update(text.trim()).digest("hex");
}

function pageTextFromItems(items: Array<Record<string, unknown>>) {
  const lines: Array<{ y: number; text: string }> = [];
  for (const item of items) {
    const text = typeof item.str === "string" ? item.str.trim() : "";
    if (!text) continue;
    const transform = Array.isArray(item.transform) ? item.transform : [];
    const y = typeof transform[5] === "number" ? transform[5] : Number.NaN;
    const previous = Number.isFinite(y) ? lines[lines.length - 1] : undefined;
    if (previous && Math.abs(previous.y - y) <= 2.5) {
      previous.text = `${previous.text} ${text}`.trim();
    } else {
      lines.push({ y: Number.isFinite(y) ? y : (previous?.y ?? 0), text });
    }
  }
  return lines.map((line) => line.text).join("\n");
}

export async function extractPdfPages(file: File): Promise<PaperPage[]> {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;
  const pages: PaperPage[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = pageTextFromItems(content.items as Array<Record<string, unknown>>);
      pages.push({ pageNumber, text, textHash: hashText(text) });
    }
  } finally {
    await loadingTask.destroy();
  }
  return pages;
}

export function buildPaperSourceText(pages: PaperPage[]) {
  return pages
    .map((page) => `=== SOURCE PAGE ${page.pageNumber} ===\n${page.text || "[No selectable text extracted. The page may contain an image, scan, or diagram.]"}`)
    .join("\n\n");
}

export function normalizePageRange(start: number, end: number, pageCount: number) {
  const safeStart = Math.max(1, Math.min(pageCount, Math.trunc(start)));
  const safeEnd = Math.max(safeStart, Math.min(pageCount, Math.trunc(end)));
  return { start: safeStart, end: safeEnd };
}
