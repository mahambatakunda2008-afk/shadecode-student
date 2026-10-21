import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { PDFParse } from "pdf-parse";
import { CURRICULUM_SOURCE_WATCHES } from "../src/lib/curriculum/source-watch.ts";
import { discoverSyllabusVersion } from "../src/lib/curriculum/version-discovery.ts";

const outputDir = ".curriculum-watch";
const snapshotDir = `${outputDir}/documents`;
const runAt = new Date().toISOString();

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function absoluteUrl(base, href) {
  try { return new URL(href, base).toString(); } catch { return null; }
}

function isAllowed(url, allowedDomains) {
  try {
    const hostname = new URL(url).hostname;
    return allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch { return false; }
}

function extractPdfLinks(html, pageUrl, allowedDomains) {
  const links = new Set();
  const pattern = /href=["']([^"']+)["']/gi;
  for (const match of html.matchAll(pattern)) {
    const candidate = absoluteUrl(pageUrl, match[1]);
    if (!candidate || !isAllowed(candidate, allowedDomains)) continue;
    if (/\.pdf(?:[?#].*)?$/i.test(candidate)) links.add(candidate);
  }
  return [...links];
}

async function fetchPage(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "Shadecode-Curriculum-Watcher/1.0" },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return { url: response.url, text: await response.text() };
}

async function fetchPdfBytes(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "Shadecode-Curriculum-Watcher/1.0" },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 5 || bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error(`Source did not return PDF bytes: ${url}`);
  }
  return { url: response.url, bytes };
}

async function extractPdf(bytes) {
  const parser = new PDFParse({ data: new Uint8Array(bytes) });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}

await mkdir(snapshotDir, { recursive: true });

const report = {
  runAt,
  watcherVersion: 6,
  sources: [],
};

for (const source of CURRICULUM_SOURCE_WATCHES) {
  const sourceResult = {
    id: source.id,
    boardId: source.boardId,
    qualificationId: source.qualificationId ?? null,
    subjectId: source.subjectId ?? null,
    level: source.level ?? null,
    syllabusId: source.syllabusId ?? null,
    syllabusVersion: source.syllabusVersion ?? null,
    versionDiscovery: null,
    objectiveCodePattern: source.objectiveCodePattern ?? null,
    authority: source.authority,
    kind: source.kind,
    sourceUrl: source.url,
    checkedAt: runAt,
    status: "ok",
    landingPageHash: null,
    documents: [],
    errors: [],
  };

  try {
    let candidates = [];
    if (source.kind === "pdf") {
      candidates = [source.url];
    } else {
      const page = await fetchPage(source.url);
      sourceResult.landingPageHash = sha256(page.text);
      candidates = source.discoverLinkedDocuments
        ? extractPdfLinks(page.text, page.url, source.allowedDomains)
        : [];
    }

    for (const documentUrl of candidates) {
      try {
        const sourcePdf = await fetchPdfBytes(documentUrl);
        const contentHash = sha256(sourcePdf.bytes);
        const text = source.extractText ? await extractPdf(sourcePdf.bytes) : "";
        const extractionHash = sha256(text);
        const sourceFile = `${snapshotDir}/${contentHash}.pdf`;
        const snapshotFile = `${snapshotDir}/${contentHash}.txt`;
        const discovery = discoverSyllabusVersion(text, documentUrl);

        await writeFile(sourceFile, sourcePdf.bytes);
        if (text) await writeFile(snapshotFile, text, "utf8");

        const effectiveVersion = source.syllabusVersion ?? discovery.version ?? null;
        if (!sourceResult.versionDiscovery && discovery.version) {
          sourceResult.versionDiscovery = {
            version: discovery.version,
            confidence: discovery.confidence,
            evidence: discovery.evidence,
          };
        }

        sourceResult.documents.push({
          url: documentUrl,
          title: documentUrl.split("/").pop() ?? documentUrl,
          syllabusVersion: effectiveVersion,
          syllabusVersionSource: source.syllabusVersion ? "registry" : discovery.version ? "document" : "unresolved",
          syllabusVersionConfidence: source.syllabusVersion ? "high" : discovery.confidence,
          syllabusVersionEvidence: source.syllabusVersion ? ["Source registry explicitly configured this syllabus version."] : discovery.evidence,
          contentHash,
          sourceBytesPath: sourceFile,
          extractionHash,
          characters: text.length,
          extracted: Boolean(text),
          textPath: text ? snapshotFile : null,
          status: "discovered",
        });
      } catch (error) {
        sourceResult.documents.push({
          url: documentUrl,
          status: "extraction-failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } catch (error) {
    sourceResult.status = "failed";
    sourceResult.errors.push(error instanceof Error ? error.message : String(error));
  }

  report.sources.push(sourceResult);
}

await writeFile(`${outputDir}/latest-report.json`, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  runAt,
  sourcesChecked: report.sources.length,
  documentsDiscovered: report.sources.reduce((sum, source) => sum + source.documents.length, 0),
  extractedSnapshots: report.sources.reduce((sum, source) => sum + source.documents.filter((document) => document.extracted).length, 0),
  unresolvedVersions: report.sources.reduce((sum, source) => sum + source.documents.filter((document) => !document.syllabusVersion).length, 0),
  failures: report.sources.filter((source) => source.status !== "ok").length,
  report: `${outputDir}/latest-report.json`,
}, null, 2));
