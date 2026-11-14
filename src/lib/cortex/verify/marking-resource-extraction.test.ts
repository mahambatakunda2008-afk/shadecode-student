import { describe, expect, it } from "vitest";
import type { ImportedMarkingResource } from "./marking-resource-import";
import { docxXmlToText } from "./docx-extraction";
import {
  extractImportedMarkingResource,
  identifyMarkingStructure,
  joinPdfTextItemsByLayout,
  parsePdfPageSelection,
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

describe("PDF text layout reconstruction", () => {
  it("retains wide gaps as tab-separated column hints", () => {
    const line = joinPdfTextItemsByLayout([
      { x: 0, width: 32, text: "Time" },
      { x: 90, width: 55, text: "Distance" },
      { x: 240, width: 40, text: "Speed" },
    ]);
    expect(line).toBe("Time\tDistance\tSpeed");
  });

  it("keeps ordinary sentence fragments separated by spaces", () => {
    expect(joinPdfTextItemsByLayout([
      { x: 0, width: 22, text: "The" },
      { x: 26, width: 35, text: "answer" },
      { x: 65, width: 12, text: "is" },
      { x: 82, width: 18, text: "42." },
    ])).toBe("The answer is 42.");
  });

  it("sorts fragments by horizontal position", () => {
    expect(joinPdfTextItemsByLayout([
      { x: 80, width: 20, text: "right" },
      { x: 0, width: 30, text: "left" },
    ])).toBe("left\tright");
  });
});

describe("PDF OCR page selection", () => {
  it("accepts unique whole pages within the document", () => {
    expect(parsePdfPageSelection("2, 4, 7", 10)).toEqual({ pages: [2, 4, 7], error: null });
  });

  it.each(["", "1,,2", "1.5", "0", "11", "2, 2", Array.from({ length: 21 }, (_, index) => index + 1).join(",")])(
    "rejects invalid page selection %s",
    input => {
      expect(parsePdfPageSelection(input, 10).pages).toEqual([]);
      expect(parsePdfPageSelection(input, 10).error).toBeTruthy();
    },
  );
});

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

  it("flags mathematical notation without claiming to parse its meaning", () => {\n    const markers = identifyMarkingStructure([\n      { page: 1, line: 1, text: "v = u + at" },\n      { page: 1, line: 2, text: "x² + y² = r²" },\n      { page: 1, line: 3, text: "The student explains the method clearly." },\n    ]);\n    expect(markers.filter(marker => marker.type === "math_notation").map(marker => marker.value)).toEqual(["v = u + at", "x² + y² = r²"]);\n  });\n\n  it("extracts TXT with line provenance and structure markers", async () => {
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
    expect(docxXmlToText(xml)).toBe("Results\n| Time / s | Distance / m |\n| 1.0 | 2.5 |");
  });

  it("fails safely when a DOCX is not a valid ZIP document", async () => {
    const source = resource("scheme.docx", "not-a-docx");
    const result = await extractImportedMarkingResource(source);
    expect(result.status).toBe("failed");
    expect(result.warnings.join(" ")).toContain("DOCX extraction failed");
    expect(result.regions).toEqual([]);
  });
});
