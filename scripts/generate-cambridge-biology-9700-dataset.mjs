import { PDFParse } from "pdf-parse";
import fs from "node:fs/promises";
import { getCurriculumExtractionProfile } from "../src/lib/curriculum/extraction-profiles.ts";
import { extractCurriculumKnowledge } from "../src/lib/curriculum/knowledge-extraction.ts";

const SOURCE = "https://www.cambridgeinternational.org/Images/664560-2025-2027-syllabus.pdf";
const OUTPUT = "src/lib/curriculum/data/cambridge-9700-2025-2027.json";
const PUBLIC_OUTPUT = "public/generated/cambridge-9700-2025-2027.json";
const profile = getCurriculumExtractionProfile("cambridge-9700-2025-2027");
if (!profile) throw new Error("Biology 9700 extraction profile is not registered.");

const response = await fetch(SOURCE, { headers: { Accept: "application/pdf" }, cache: "no-store" });
if (!response.ok) throw new Error(`Biology 9700 PDF fetch failed: HTTP ${response.status}`);

const parser = new PDFParse({ data: Buffer.from(await response.arrayBuffer()) });
try {
  const extracted = await parser.getText();
  const text = extracted.text?.trim() ?? "";
  if (!text) throw new Error("Biology 9700 PDF extraction returned no text.");

  const identity = {
    boardId: "cambridge",
    qualificationId: "cambridge-as-a-level",
    level: "a_level",
    syllabusId: "cambridge-9700",
    syllabusVersion: "2025-2027",
    subjectId: "biology",
  };
  const provenance = {
    authority: "Cambridge International Education",
    sourceDocument: SOURCE,
    sourceUrl: SOURCE,
    retrievedAt: new Date().toISOString(),
    mappingStatus: "reviewed",
  };

  const items = extractCurriculumKnowledge(text, identity, provenance, profile);
  const topics = items.filter((item) => item.kind === "topic");
  const subsections = items
    .filter((item) => item.kind === "content_scope" && /^\d+\.\d+\s/.test(item.title))
    .map((item) => ({
      key: item.code ?? item.metadata?.subsectionCode,
      title: item.title.replace(/^\d+\.\d+\s+/, ""),
      topic: String(item.code ?? "").split(".")[0],
    }))
    .filter((item) => item.key);
  const outcomes = items
    .filter((item) => item.kind === "learning_outcome")
    .map((item) => ({
      key: item.code,
      parent: item.metadata?.subsectionCode ?? null,
      topic: String(item.code ?? "").split(".")[0],
      subsection: item.metadata?.subsectionCode ?? null,
      title: item.title,
      description: item.content,
    }));

  const codes = outcomes.map((item) => item.key).filter(Boolean);
  if (topics.length !== 19 || subsections.length !== 44 || outcomes.length !== 259 || new Set(codes).size !== codes.length) {
    throw new Error(`Biology extraction gate failed: topics=${topics.length}, subsections=${subsections.length}, outcomes=${outcomes.length}, uniqueCodes=${new Set(codes).size}`);
  }

  const dataset = {
    meta: {
      authority: "Cambridge International",
      boardId: "cambridge",
      qualificationId: "cambridge-as-a-level",
      syllabusId: "cambridge-9700",
      syllabusVersion: "2025-2027",
      subjectId: "biology",
      sourceUrl: SOURCE,
      retrievedAt: new Date().toISOString().slice(0, 10),
      representation: "Official syllabus hierarchy with normalized, source-checked numbered learning outcomes for Topics 1-19.",
      sourceVerification: "Generated from the official Cambridge 9700 2025-2027 PDF by the reusable curriculum extraction engine.",
      counts: { topics: topics.length, subsections: subsections.length, learningOutcomes: outcomes.length },
    },
    sections: topics.map((topic) => {
      const key = String(topic.code ?? topic.title.match(/^(\d+)/)?.[1]);
      return {
        key,
        title: topic.title.replace(/^\d+\s+/, ""),
        level: Number(key) <= 11 ? "as_level" : "a_level",
        topics: subsections
          .filter((section) => section.topic === key)
          .map((section) => ({
            key: section.key,
            title: section.title,
            representation: "official_numbered_outcomes_normalized",
            outcomes: outcomes.filter((outcome) => outcome.parent === section.key).map((outcome) => outcome.description),
          })),
      };
    }),
  };

  const serialized = JSON.stringify(dataset, null, 2) + "\n";
  await fs.mkdir("src/lib/curriculum/data", { recursive: true });
  await fs.mkdir("public/generated", { recursive: true });
  await fs.writeFile(OUTPUT, serialized);
  await fs.writeFile(PUBLIC_OUTPUT, serialized);
  console.log(`Generated Biology 9700 dataset: ${outcomes.length} outcomes across ${subsections.length} subsections.`);
} finally {
  await parser.destroy();
}
