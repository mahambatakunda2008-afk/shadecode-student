import { createClient } from "@supabase/supabase-js";
import { evaluateCurriculumReadiness } from "../src/lib/curriculum/readiness-gate.ts";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(2);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function readTable(table, columns = "*") {
  const { data, error } = await supabase.from(table).select(columns);
  if (error) throw new Error(`Read ${table}: ${error.message}`);
  return data ?? [];
}

const [versions, documents, coverage, objectives, sources] = await Promise.all([
  readTable("curriculum_versions"),
  readTable("curriculum_documents"),
  readTable("curriculum_coverage_checks"),
  readTable("curriculum_objectives"),
  readTable("curriculum_sources"),
]);

const documentsById = new Map(documents.map((row) => [row.id, row]));
const sourcesById = new Map(sources.map((row) => [row.id, row]));
const coverageByVersion = new Map();
for (const row of coverage) {
  const list = coverageByVersion.get(row.curriculum_version_id) ?? [];
  list.push(row);
  coverageByVersion.set(row.curriculum_version_id, list);
}
const objectivesByVersion = new Map();
for (const row of objectives) {
  const summary = objectivesByVersion.get(row.curriculum_version_id) ?? { total: 0, verified: 0 };
  summary.total += 1;
  if (row.status === "verified") summary.verified += 1;
  objectivesByVersion.set(row.curriculum_version_id, summary);
}

const results = versions.map((version) => {
  const document = documentsById.get(version.source_document_id) ?? null;
  const source = document ? sourcesById.get(document.source_id) ?? null : null;
  const coverageChecks = coverageByVersion.get(version.id) ?? [];
  const objectiveSummary = objectivesByVersion.get(version.id) ?? { total: 0, verified: 0 };
  const readiness = evaluateCurriculumReadiness({
    versionStatus: version.status,
    sourceDocumentId: version.source_document_id,
    document: document ? {
      url: document.url,
      contentHash: document.content_hash,
      contentCharacters: document.content_characters,
      extractedText: document.extracted_text,
      extractionStatus: document.extraction_status,
      status: document.status,
    } : null,
    coverageChecks,
    expectedCoverageDimensions: 29,
    objectiveCount: objectiveSummary.total,
    verifiedObjectiveCount: objectiveSummary.verified,
    provenance: version.provenance ?? {},
  });
  return {
    board: version.board_id,
    qualification: version.qualification_id,
    subject: version.subject_id,
    syllabusId: version.syllabus_id,
    syllabusVersion: version.syllabus_version,
    storedStatus: version.status,
    sourceUrl: document?.url ?? source?.url ?? null,
    sourceAuthority: source?.authority ?? null,
    sourceAutoPromote: source?.auto_promote ?? null,
    documentStatus: document?.status ?? null,
    extractionStatus: document?.extraction_status ?? null,
    ...readiness,
  };
}).sort((a, b) => `${a.board}/${a.syllabusId}/${a.syllabusVersion}`.localeCompare(`${b.board}/${b.syllabusId}/${b.syllabusVersion}`));

const report = {
  generatedAt: new Date().toISOString(),
  mode: "read-only",
  disclaimer: "This report reads existing rows only. It does not update curriculum statuses, promote versions, or prove syllabus correctness.",
  totals: {
    versions: results.length,
    ready: results.filter((row) => row.ready).length,
    blocked: results.filter((row) => !row.ready).length,
    documentsWithoutText: documents.filter((row) => !row.extracted_text?.trim()).length,
    sourcesWithAutoPromote: sources.filter((row) => row.auto_promote === true).length,
  },
  versions: results,
};

console.log(JSON.stringify(report, null, 2));
if (process.argv.includes("--fail-on-blockers") && report.totals.blocked > 0) process.exitCode = 1;
