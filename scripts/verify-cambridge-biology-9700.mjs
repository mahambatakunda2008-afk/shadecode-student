import { PDFParse } from "pdf-parse";
import { getCurriculumExtractionProfile } from "../src/lib/curriculum/extraction-profiles.ts";
import { extractCurriculumKnowledge } from "../src/lib/curriculum/knowledge-extraction.ts";

const SOURCE = "https://www.cambridgeinternational.org/Images/664560-2025-2027-syllabus.pdf";
const EXPECTED_TOPICS = 19;
const EXPECTED_AS_TOPICS = 11;
const profile = getCurriculumExtractionProfile("cambridge-9700-2025-2027");

const response = await fetch(SOURCE, { headers: { Accept: "application/pdf" }, cache: "no-store" });
if (!response.ok) throw new Error(`Biology 9700 PDF fetch failed: HTTP ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
const parser = new PDFParse({ data: bytes });

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
  const subsections = items.filter((item) => item.kind === "content_scope" && /^\d+\.\d+\s+/.test(item.title));
  const outcomes = items.filter((item) => item.kind === "learning_outcome");

  const outcomeCodes = outcomes.map((item) => item.code).filter(Boolean);
  const uniqueCodes = new Set(outcomeCodes);
  const invalidCodes = outcomeCodes.filter((code) => !/^\d+\.\d+\.\d+$/.test(code));
  const topicNumbers = topics.map((item) => Number(item.title.match(/^(\d+)/)?.[1])).filter(Number.isFinite);
  const topicSet = new Set(topicNumbers);

  const byTopic = Object.fromEntries(
    Array.from({ length: EXPECTED_TOPICS }, (_, i) => {
      const topic = i + 1;
      return [String(topic), outcomes.filter((item) => Number(item.code?.split(".")[0]) === topic).length];
    }),
  );

  const report = {
    syllabus: "Cambridge International AS & A Level Biology 9700",
    version: "2025-2027",
    pdfPages: extracted.total,
    topics: topics.length,
    asTopics: topicNumbers.filter((n) => n >= 1 && n <= EXPECTED_AS_TOPICS).length,
    aLevelTopics: topicSet.size,
    subsections: subsections.length,
    learningOutcomes: outcomes.length,
    uniqueLearningOutcomeCodes: uniqueCodes.size,
    invalidLearningOutcomeCodes: invalidCodes.length,
    topicOutcomeCounts: byTopic,
  };

  console.log(JSON.stringify(report, null, 2));

  const failures = [];
  if (topics.length !== EXPECTED_TOPICS) failures.push(`expected ${EXPECTED_TOPICS} topics, got ${topics.length}`);
  if (report.asTopics !== EXPECTED_AS_TOPICS) failures.push(`expected ${EXPECTED_AS_TOPICS} AS topics, got ${report.asTopics}`);
  if (report.aLevelTopics !== EXPECTED_TOPICS) failures.push(`expected ${EXPECTED_TOPICS} A Level topics, got ${report.aLevelTopics}`);
  if (subsections.length === 0) failures.push("no numbered subsections extracted");
  if (outcomes.length === 0) failures.push("no numbered learning outcomes extracted");
  if (uniqueCodes.size !== outcomeCodes.length) failures.push("duplicate learning outcome codes detected");
  if (invalidCodes.length) failures.push(`invalid outcome codes: ${invalidCodes.slice(0, 10).join(", ")}`);
  if (outcomes.some((item) => !item.metadata?.subsectionCode)) failures.push("outcome missing subsection binding");

  if (failures.length) {
    throw new Error("Biology 9700 curriculum verification failed:\n- " + failures.join("\n- "));
  }
} finally {
  await parser.destroy();
}
