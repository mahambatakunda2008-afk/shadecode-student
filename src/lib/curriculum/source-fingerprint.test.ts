import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { fingerprintExtractedText, fingerprintPdfBytes } from "./source-fingerprint";

describe("curriculum source fingerprints", () => {
  const pdfBytes = Buffer.concat([
    Buffer.from("%PDF-1.7\n", "ascii"),
    Buffer.from("representative PDF payload", "utf8"),
  ]);

  it("fingerprints the original PDF bytes rather than its extracted text", () => {
    const sourceHash = fingerprintPdfBytes(pdfBytes);
    const expectedByteHash = createHash("sha256").update(pdfBytes).digest("hex");
    expect(sourceHash).toBe(expectedByteHash);
    expect(sourceHash).not.toBe(fingerprintExtractedText("representative PDF payload"));
  });

  it("changes the source fingerprint when PDF bytes change", () => {
    const changedBytes = Buffer.concat([pdfBytes, Buffer.from("\nupdated", "utf8")]);
    expect(fingerprintPdfBytes(changedBytes)).not.toBe(fingerprintPdfBytes(pdfBytes));
  });

  it("keeps extraction fingerprints separate and deterministic", () => {
    expect(fingerprintExtractedText("topic 1")).toBe(fingerprintExtractedText("topic 1"));
    expect(fingerprintExtractedText("topic 1")).not.toBe(fingerprintExtractedText("topic 2"));
  });

  it("rejects HTML, empty, and other non-PDF responses", () => {
    expect(() => fingerprintPdfBytes(Buffer.from("<html>not a PDF</html>"))).toThrow("%PDF-");
    expect(() => fingerprintPdfBytes(Buffer.alloc(0))).toThrow("%PDF-");
    expect(() => fingerprintPdfBytes(Buffer.from("not a PDF"))).toThrow("%PDF-");
  });
});
