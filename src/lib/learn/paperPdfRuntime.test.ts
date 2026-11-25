import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { extractPdfPages } from "@/lib/learn/paperLearning";
import { loadPaperPdfRuntime } from "@/lib/learn/paperPdfRuntime";

describe("paper PDF runtime", () => {
  const runtime = globalThis as unknown as Record<string, unknown>;
  let originalDOMMatrix: unknown;
  let originalPath2D: unknown;

  beforeEach(() => {
    originalDOMMatrix = runtime.DOMMatrix;
    originalPath2D = runtime.Path2D;
    delete runtime.DOMMatrix;
    delete runtime.Path2D;
  });

  afterEach(() => {
    if (originalDOMMatrix === undefined) delete runtime.DOMMatrix;
    else runtime.DOMMatrix = originalDOMMatrix;
    if (originalPath2D === undefined) delete runtime.Path2D;
    else runtime.Path2D = originalPath2D;
  });

  it("loads the Node PDF.js build after explicitly installing canvas globals", async () => {
    const pdfjs = await loadPaperPdfRuntime();

    expect(typeof pdfjs.getDocument).toBe("function");
    expect(typeof runtime.DOMMatrix).toBe("function");
    expect(typeof runtime.Path2D).toBe("function");
  });

  it("extracts real paper pages without a pre-existing browser DOMMatrix", async () => {
    const bytes = new Uint8Array(readFileSync("economics/9708_m22_qp_12.pdf"));
    const file = new File([bytes], "9708_m22_qp_12.pdf", { type: "application/pdf" });
    const pages = await extractPdfPages(file);

    expect(pages.length).toBeGreaterThan(0);
    expect(pages.some(page => page.text.trim().length > 0)).toBe(true);
    expect(pages[0].visual.width).toBeGreaterThan(0);
  });
});
