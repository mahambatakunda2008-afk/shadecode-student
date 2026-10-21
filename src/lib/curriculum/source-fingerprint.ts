import { createHash } from "node:crypto";

const PDF_SIGNATURE = Buffer.from("%PDF-", "ascii");

/** Hash the original PDF bytes, never the extracted text. */
export function fingerprintPdfBytes(input: Uint8Array): string {
  const bytes = Buffer.from(input);
  if (bytes.length < PDF_SIGNATURE.length || !bytes.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)) {
    throw new Error("Source did not return PDF bytes: missing %PDF- signature");
  }
  return createHash("sha256").update(bytes).digest("hex");
}

/** Keep extraction identity separate from the source-file fingerprint. */
export function fingerprintExtractedText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
