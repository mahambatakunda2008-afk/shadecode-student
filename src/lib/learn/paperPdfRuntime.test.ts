import { describe, expect, it } from "vitest";

describe("paper PDF runtime", () => {
  it("loads the Node PDF.js build without a browser DOMMatrix global", async () => {
    const runtime = globalThis as typeof globalThis & { DOMMatrix?: unknown };
    const original = runtime.DOMMatrix;
    try {
      delete runtime.DOMMatrix;
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      expect(typeof pdfjs.getDocument).toBe("function");
      expect(typeof runtime.DOMMatrix).toBe("function");
    } finally {
      if (original === undefined) delete runtime.DOMMatrix;
      else runtime.DOMMatrix = original;
    }
  });
});
