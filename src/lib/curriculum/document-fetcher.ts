import { createHash } from "node:crypto";
import { PDFParse } from "pdf-parse";

export type FetchedCurriculumDocument = { url: string; contentType: string; contentHash: string; bytes: number; text: string; pageCount?: number; extractionEngine: string; extractionVersion: string };
const EXTRACTION_ENGINE = "pdf-parse";
const EXTRACTION_VERSION = "2.4.5";

export async function fetchAndExtractCurriculumDocument(url: string, allowedDomains: string[]): Promise<FetchedCurriculumDocument> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") throw new Error("Curriculum sources must use HTTPS.");
  const host = parsed.hostname.toLowerCase();
  const allowed = allowedDomains.some((domain) => host === domain.toLowerCase() || host.endsWith(`.${domain.toLowerCase()}`));
  if (!allowed) throw new Error(`Source host ${host} is not allow-listed.`);
  const response = await fetch(url, { headers: { Accept: "application/pdf" }, redirect: "follow", cache: "no-store" });
  if (!response.ok) throw new Error(`Curriculum document fetch failed: HTTP ${response.status}`);
  const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (contentType !== "application/pdf" && !url.toLowerCase().endsWith(".pdf")) throw new Error(`Expected an official PDF, received ${contentType || "unknown content type"}.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error("Curriculum document is empty.");
  if (bytes.length > 25 * 1024 * 1024) throw new Error("Curriculum document exceeds the 25 MB ingestion limit.");
  const parser = new PDFParse({ data: bytes });
  try {
    const result = await parser.getText();
    const text = result.text?.trim() ?? "";
    if (!text) throw new Error("PDF extraction produced no text. Refusing to ingest an unverified document.");
    return { url, contentType: contentType || "application/pdf", contentHash: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length, text, pageCount: typeof result.total === "number" ? result.total : undefined, extractionEngine: EXTRACTION_ENGINE, extractionVersion: EXTRACTION_VERSION };
  } finally { await parser.destroy(); }
}
