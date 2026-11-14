import { describe, expect, it } from "vitest";
import type { ImportedMarkingResource } from "./marking-resource-import";
import { docxXmlToText } from "./docx-extraction";
import {
  extractImportedMarkingResource,
  identifyMarkingStructure,
} from "./marking-resource-extraction";

function resource(fileName: string, content: string): ImportedMarkingResource {
  const blob = new Blob([content], { type: fileName.endsWith(".txt") ? "text/plain" : "application/pdf" });
  return {
    id: "resource-1",
    ownerId: "learner-1",
    title: fileName,
    kind: "official_mark_scheme",
    access: "user_upload",
    reuse: "unknown",
    review: "retrieved",
    authority: "User supplied",
    syllabusIdentity: {
      boardId: "cambridge",
      qualificationId: "as",
      level: "AS",
      subjectId: "9702",
      syllabusId: "9702",
      syllabusVersion: "2025-2027",
    },
    fileName,
    mimeType: blob.type,
    byteLength: blob.size,
    fileBlob: blob,
    extractionStatus: "pending",
    extractionWarnings: [],
    contentSha256: "a".repeat(64),
  };
}

describe("marking resource extraction", () => {
  it("identifies question, subquestion, marks, marking codes and visual references", () => {
    const markers = identifyMarkingStructure([
      { page: 2, line: 1, text: "1 Explain the principle of conservation of momentum." },
      { page: 2, line: 2, text: "(a) State the law. [2 marks]" },
      { page: 2, line: 3, text: "M1 for correct substitution; A1 for answer." },
      { page: 3, line: 1, text: "Plot a graph using the results in Table 1." },
    ]);
    expect(markers.some(marker => marker.type === "question" && marker.page === 2)).toBe(true);
    expect(markers.some(marker => marker.type === "subquestion")).toBe(true);
    expect(markers.some(marker => marker.type === "marks" && marker.value === "[2 marks]")).toBe(true);
    expect(markers.some(marker => marker.type === "marking_code" && marker.value.includes("M1"))).toBe(true);
    expect(markers.some(marker => marker.type === "diagram_reference")).toBe(true);
    expect(markers.some(marker => marker.type === "table_hint")).toBe(true);
  });

  it("extracts TXT with line provenance and structure markers", async () => {
    const result = await extractImportedMarkingResource(resource(
      "scheme.txt",
      "1 State the equation.\n(a) Define acceleration. [2 marks]\nM1 for method; A1 for answer.",
    ));
    expect(result.status).toBe("extracted");
    expect(result.pageCount).toBe(1);
    expect(result.lines.map(line => line.line)).toEqual([1, 2, 3]);
    expect(result.lines.every(line => line.page === 1)).toBe(true);
    expect(result.markers.length).toBeGreaterThanOrEqual(4);
    expect(result.contentSha256).toBe("a".repeat(64));
    expect(result.regions).toEqual([]);
  });

  it("does not pretend an image has been OCR'd", async () => {
    const source = resource("scan.png", "image-bytes");
    const result = await extractImportedMarkingResource(source);
    expect(result.status).toBe("needs_ocr");
    expect(result.lines).toHaveLength(0);
    expect(result.regions).toEqual([]);
    expect(result.warnings.join(" ")).toContain("OCR/vision adapter");
  });

  it("extracts readable WordprocessingML paragraphs and preserves tabs", () => {
    const xml = `<?xml version="1.0"?><w:document xmlns:w="urn:w"><w:body><w:p><w:r><w:t>1 Explain &amp; define.</w:t></w:r></w:p><w:p><w:r><w:t>Method</w:t></w:r><w:r><w:tab/><w:t>[2 marks]</w:t></w:r></w:p></w:body></w:document>`;
    expect(docxXmlToText(xml)).toBe("1 Explain & define.\nMethod\t[2 marks]");
  });

  it("preserves DOCX table row and cell boundaries", () => {
    const xml = `<w:document xmlns:w="urn:w"><w:body><w:p><w:r><w:t>Results</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Time / s</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Distance / m</w:t></w:r></w:p></w:tc></w:tr><w:tr><w:tc><w:p><w:r><w:t>1.0</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>2.5</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>`;
    expect(docxXmlToText(xml)).toBe("Results\\n| Time / s | Distance / m |\\n| 1.0 | 2.5 |");
  });

  it("fails safely when a DOCX is not a valid ZIP document", async () => {
    const source = resource("scheme.docx", "not-a-docx");
    const result = await extractImportedMarkingResource(source);
    expect(result.status).toBe("failed");
    expect(result.warnings.join(" ")).toContain("DOCX extraction failed");
    expect(result.regions).toEqual([]);
  });
});
