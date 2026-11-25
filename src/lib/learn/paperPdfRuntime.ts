import "server-only";

/**
 * PDF.js 6 references DOMMatrix during module evaluation. Its optional
 * @napi-rs/canvas fallback is not reliably included in serverless output
 * tracing, so load the declared native dependency explicitly and install the
 * standards globals before importing PDF.js.
 */
export async function loadPaperPdfRuntime() {
  const canvas = await import("@napi-rs/canvas");
  const runtime = globalThis as unknown as Record<string, unknown>;

  if (typeof runtime.DOMMatrix !== "function") runtime.DOMMatrix = canvas.DOMMatrix;
  if (typeof runtime.Path2D !== "function") runtime.Path2D = canvas.Path2D;

  if (typeof runtime.DOMMatrix !== "function") {
    throw new Error("The PDF runtime could not initialise DOMMatrix.");
  }

  return import("pdfjs-dist/legacy/build/pdf.mjs");
}
