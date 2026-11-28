import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { createResource, type ShadeNetResource } from "./content";

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_TEXT = 40_000;
const MAX_PDF_PAGES = 20;
const DNS_LOOKUP_TIMEOUT_MS = 2_500;
type Fetcher = typeof fetch;
type Resolver = (hostname: string) => Promise<string[]>;

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const parts = address.split(".").map(Number);
    return parts[0] === 0 || parts[0] === 10 || parts[0] === 127 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) ||
      parts[0] >= 224;
  }
  if (isIP(address) === 6) {
    const value = address.toLowerCase();
    return value === "::" || value === "::1" || value.startsWith("fc") ||
      value.startsWith("fd") || value.startsWith("fe80:") ||
      value.startsWith("::ffff:") || value.startsWith("2001:db8:");
  }
  return true;
}

export async function resolvePublicHostname(
  hostname: string,
  lookupHost: (value: string) => Promise<Array<{ address: string }>> = (value) => lookup(value, { all: true, verbatim: true }),
  timeoutMs = DNS_LOOKUP_TIMEOUT_MS,
): Promise<string[]> {
  if (isIP(hostname)) return [hostname];
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const addresses = await Promise.race([
      lookupHost(hostname),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("The source hostname lookup timed out.")), timeoutMs);
      }),
    ]);
    return addresses.map((entry) => entry.address);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function defaultResolver(hostname: string): Promise<string[]> {
  return resolvePublicHostname(hostname);
}

async function validatePublicUrl(value: string, resolver: Resolver): Promise<URL> {
  if (value.length > 2_048) throw new Error("The source URL is too long.");
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Enter a valid source URL."); }
  if (url.protocol !== "https:" || url.username || url.password || !url.hostname ||
      url.hostname === "localhost" || url.hostname.endsWith(".localhost") ||
      url.hostname.endsWith(".local") || url.hostname.endsWith(".internal")) {
    throw new Error("Only public HTTPS webpages and PDFs can be read.");
  }
  const addresses = await resolver(url.hostname);
  if (!addresses.length || addresses.some(isPrivateAddress)) {
    throw new Error("This source does not resolve to a public internet address.");
  }
  return url;
}

async function readBounded(response: Response): Promise<Uint8Array> {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) throw new Error("This document is larger than the 8 MB reading limit.");
  if (!response.body) return new Uint8Array(await response.arrayBuffer());
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        throw new Error("This document is larger than the 8 MB reading limit.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

function decodeHtmlText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|nav|footer|header|form)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/section|\/article|\/tr)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Math.min(0x10ffff, Number(n))))
    .replace(/[ \t]+/g, " ").replace(/\n\s*/g, "\n").replace(/\n{3,}/g, "\n\n")
    .trim().slice(0, MAX_TEXT);
}

function extractHtmlTitle(html: string, fallback: string): string {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtmlText(match[1]).slice(0, 240) || fallback : fallback;
}

async function extractPdfText(bytes: Uint8Array): Promise<{ text: string; pages: number }> {
  // PDF.js 6.x expects browser geometry globals in Node when its optional
  // canvas adapter cannot be resolved by the server bundler. Supply the
  // already-installed native canvas implementations before loading PDF.js.
  const canvas = await import("@napi-rs/canvas");
  const runtime = globalThis as unknown as Record<string, unknown>;
  runtime.DOMMatrix ??= canvas.DOMMatrix;
  runtime.ImageData ??= canvas.ImageData;
  runtime.Path2D ??= canvas.Path2D;

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await pdfjs.getDocument({ data: bytes, useSystemFonts: true }).promise;
  const pages = Math.min(document.numPages, MAX_PDF_PAGES);
  const output: string[] = [];
  for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.flatMap((item) => "str" in item ? [item.str] : []).join(" ");
    output.push(text);
    if (output.join("\n").length >= MAX_TEXT) break;
  }
  return { text: output.join("\n\n").replace(/[ \t]+/g, " ").trim().slice(0, MAX_TEXT), pages: document.numPages };
}

export interface ReadWebDocumentOptions {
  url: string;
  subject?: string;
  qualification?: string;
  syllabus?: string;
  fetcher?: Fetcher;
  resolver?: Resolver;
}

export async function readPublicWebDocument(options: ReadWebDocumentOptions): Promise<ShadeNetResource> {
  const fetcher = options.fetcher ?? fetch;
  const resolver = options.resolver ?? defaultResolver;
  let url = await validatePublicUrl(options.url, resolver);
  let response: Response | null = null;
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    response = await fetcher(url.toString(), {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
      headers: { accept: "text/html,application/pdf;q=0.9" },
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    const location = response.headers.get("location");
    if (!location || redirect === 3) throw new Error("The source redirected too many times.");
    url = await validatePublicUrl(new URL(location, url).toString(), resolver);
  }
  if (!response || !response.ok) throw new Error(`The source returned HTTP ${response?.status ?? "unknown"}.`);
  const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!["text/html", "application/xhtml+xml", "application/pdf"].includes(contentType)) {
    throw new Error("This source is not an HTML webpage or PDF.");
  }
  const bytes = await readBounded(response);
  const isPdf = contentType === "application/pdf" || new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  let title = url.hostname;
  let text: string;
  let details: Record<string, unknown>;
  if (isPdf) {
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error("The PDF file signature is invalid.");
    const extracted = await extractPdfText(bytes);
    text = extracted.text;
    title = url.pathname.split("/").pop() || "PDF document";
    details = { documentType: "pdf", pageCount: extracted.pages, pagesExtracted: Math.min(extracted.pages, MAX_PDF_PAGES) };
  } else {
    const html = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    title = extractHtmlTitle(html, title);
    text = decodeHtmlText(html);
    details = { documentType: "webpage" };
  }
  if (text.length < 80) throw new Error("This source contains too little extractable text to be useful.");
  const retrievedAt = new Date().toISOString();
  return createResource({
    metadata: {
      type: "other",
      title,
      subject: options.subject,
      qualification: options.qualification,
      syllabus: options.syllabus,
      source: url.toString(),
      authorOrPublisher: url.hostname,
      verificationStatus: "unverified",
      createdAt: retrievedAt,
    },
    content: {
      kind: "web-document",
      text,
      retrievedAt,
      lastModified: response.headers.get("last-modified"),
      provenance: "Text extracted from a publicly accessible source. Content is unverified and may be incomplete.",
      ...details,
    },
  });
}
