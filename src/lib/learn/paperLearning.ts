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

export async function extractPdfPages(file: File): Promise<Paper¶»§q«^