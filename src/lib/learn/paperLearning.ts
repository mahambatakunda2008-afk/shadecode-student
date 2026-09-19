import { createHash } from "node:crypto";

export type PaperPage = {
  pageNumber: number;
  text: string;
  textHash: string;
  visual: {
    width: number;
    height: number;
    imageCount: number;
    vectorGraphicCount: number;
    hasVisualContent: boolean;
  };
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

export type PaperQuestionCorrection = {
  questionNumber: string;
  correctedText: string;
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
      const viewport = page.getViewport({ scale: 1 });
      let imageCount = 0;
      let vectorGraphicCount = 0;
      try {
        const operatorList = await page.getOperatorList();
        const OPS = pdfjs.OPS as Record<string, number>;
        const imageOps = new Set([
          OPS.paintImageMaskXObject,
          OPS.paintImageMaskXObjectRepeat,
          OPS.paintSolidColorImageMask,
          OPS.paintImageXObject,
          OPS.paintInlineImageXObject,
        ].filter((value): value is number => typeof value === "number"));
        const vectorOps = new Set([
          OPS.constructPath,
          OPS.paintSolidColorImageMask,
        ].filter((value): value is number => typeof value === "number"));
        for (const op of operatorList.fnArray) {
          if (imageOps.has(op)) imageCount += 1;
          if (vectorOps.has(op)) vectorGraphicCount += 1;
        }
      } catch {
        // Keep text extraction usable if operator inspection is unavailable.
      }
      pages.push({
        pageNumber,
        text,
        textHash: hashText(text),
        visual: {
          width: Math.round(viewport.width),
          height: Math.round(viewport.height),
          imageCount,
          vectorGraphicCount,
          hasVisualContent: imageCount > 0 || vectorGraphicCount > 0,
        },
      });
    }
  } finally {
    await loadingTask.destroy();
  }
  return pages;
}

export function buildPaperSourceText(pages: PaperPage[]) {
  return pages
    .map((page) => {
      const visualInfo = page.visual;
      const visual = visualInfo?.hasVisualContent
        ? `[VISUAL CONTENT DETECTED: ${visualInfo.imageCount} embedded image operation(s), ${visualInfo.vectorGraphicCount} vector graphic operation(s), page ${visualInfo.width}×${visualInfo.height}pt. The extracted text does not fully represent this visual content. Do not invent what it contains.]`
        : visualInfo
          ? `[No embedded image/vector operations detected; page dimensions ${visualInfo.width}×${visualInfo.height}pt.]`
          : `[Visual inspection metadata unavailable. Do not infer diagrams, images, or layout that are not represented in extracted text.]`;
      return `=== SOURCE PAGE ${page.pageNumber} ===\n${visual}\n${page.text || "[No selectable text extracted. The page may contain an image, scan, or diagram.]"}`;
    })
    .join("\n\n");
}

export function normalizePageRange(start: number, end: number, pageCount: number) {
  const safeStart = Math.max(1, Math.min(pageCount, Math.trunc(start)));
  const safeEnd = Math.max(safeStart, Math.min(pageCount, Math.trunc(end)));
  return { start: safeStart, end: safeEnd };
}

export function selectPaperQuestions<T extends { questionNumber: string }>(questions: T[], requestedNumbers: string[]) {
  const requested = [...new Set(requestedNumbers.map(number => number.trim()).filter(Boolean))];
  if (!requested.length) return { selected: questions, requestedNumbers: [], missingNumbers: [] as string[] };
  const available = new Set(questions.map(question => question.questionNumber));
  const selected = questions.filter(question => requested.includes(question.questionNumber));
  const missingNumbers = requested.filter(number => !available.has(number));
  return { selected, requestedNumbers: requested, missingNumbers };
}

export function applyQuestionCorrections<T extends { questionNumber: string; questionText: string }>(
  questions: T[],
  corrections: PaperQuestionCorrection[],
) {
  const correctionMap = new Map(
    corrections
      .map(item => ({ questionNumber: item.questionNumber.trim(), correctedText: item.correctedText.trim() }))
      .filter(item => item.questionNumber && item.correctedText.length >= 3 && item.correctedText.length <= 6000)
      .map(item => [item.questionNumber, item.correctedText]),
  );
  const invalidNumbers = corrections
    .map(item => item.questionNumber.trim())
    .filter(Boolean)
    .filter(number => !questions.some(question => question.questionNumber === number));
  if (invalidNumbers.length) {
    return { questions, appliedNumbers: [] as string[], invalidNumbers: [...new Set(invalidNumbers)] };
  }
  const appliedNumbers: string[] = [];
  const corrected = questions.map(question => {
    const replacement = correctionMap.get(question.questionNumber);
    if (!replacement || replacement === question.questionText.trim()) return question;
    appliedNumbers.push(question.questionNumber);
    return { ...question, questionText: replacement };
  });
  return { questions: corrected, appliedNumbers, invalidNumbers: [] as string[] };
}

type NumberedQuestionStart = {
  pageNumber: number;
  lineIndex: number;
  number: string;
};

const TOP_LEVEL_QUESTION_RE = /^\s*(\d{1,3})[.)](?:\s+|$)/;

function findTopLevelQuestionStarts(pages: Array<Pick<PaperPage, "pageNumber" | "text">>) {
  const starts: NumberedQuestionStart[] = [];
  for (const page of pages) {
    const lines = page.text.split(/\r?\n/);
    lines.forEach((line, lineIndex) => {
      const match = line.match(TOP_LEVEL_QUESTION_RE);
      if (!match) return;
      starts.push({ pageNumber: page.pageNumber, lineIndex, number: match[1] });
    });
  }
  return starts;
}

export function extractTopLevelQuestionsFromPages(
  pages: Array<Pick<PaperPage, "pageNumber" | "text">>,
): PaperQuestion[] {
  const starts = findTopLevelQuestionStarts(pages);
  if (!starts.length) return [];

  const pageLines = new Map(pages.map((page) => [page.pageNumber, page.text.split(/\r?\n/)]));
  const questions: PaperQuestion[] = [];

  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const next = starts[index + 1];
    const collected: string[] = [];
    let sourcePageEnd = start.pageNumber;

    for (const page of pages) {
      if (page.pageNumber < start.pageNumber || (next && page.pageNumber > next.pageNumber)) continue;
      const lines = pageLines.get(page.pageNumber) ?? [];
      const from = page.pageNumber === start.pageNumber ? start.lineIndex : 0;
      let to = lines.length;
      if (next && page.pageNumber === next.pageNumber) to = next.lineIndex;
      if (page.pageNumber === start.pageNumber && next?.pageNumber === start.pageNumber) {
        to = next.lineIndex;
      }
      if (from < to) collected.push(...lines.slice(from, to));
      if (page.pageNumber >= start.pageNumber) sourcePageEnd = page.pageNumber;
    }

    const questionText = collected.join("\n").trim();
    if (!questionText) continue;

    const marksMatches = [...questionText.matchAll(/\[(\d{1,3})\]/g)];
    const marks = marksMatches.length ? Number(marksMatches[marksMatches.length - 1][1]) : null;

    questions.push({
      questionNumber: start.number,
      sourcePageStart: start.pageNumber,
      sourcePageEnd,
      questionText: questionText.replace(/\n\s*\(\s*[a-z]\s*\)[^\n]*/gi, "").trim(),
      extractionMethod: "deterministic-top-level-numbering",
      extractionConfidence: 0.96,
      marks,
    });
  }

  return questions;
}
