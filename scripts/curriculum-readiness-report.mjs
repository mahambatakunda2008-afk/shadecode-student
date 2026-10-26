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
  // PostgREST commonly caps a response at 1,000 rows. Read stable, bounded pages
  // so readiness totals never silently omit objectives or evidence rows.
  const pageSize = 500;
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from(table)
      .select(columns)
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`Read ${table} (offset ${offset}): ${error.message}`);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

const [versions, documents, coverage, objectives, sources, ingestionRuns] = await Promise.all([
  readTable("curriculum_versions"),
  readTable("curriculum_documents"),
  readTable("curriculum_coverage_checks"),
  readTable("curriculum_objectives"),
  readTable("curriculum_sources"),
  readTable("curriculum_ingestion_runs"),
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
const runsBySource = new Map();
for (const run of ingestionRuns) {
  const list = runsBySource.get(run.source_id) ?? [];
  list.push(run);
  runsBySource.set(run.source_id, list);
}
for (const runs of runsBySource.values()) {
  runs.sort((a, b) => Date.parse(b.started_at ?? "") - Date.parse(a.started_at ?? ""));
}

const results = versions.map((version) => {
  const document = documentsById.get(version.source_document_id) ?? null;
  const source = document ? sourcesById.get(document.source_id) ?? null : null;
  const sourceRuns = source ? runsBySource.get(source.id) ?? [] : [];
  const latestRun = sourceRuns[0] ?? null;
  const coverageChecks = coverageByVersion.get(version.id) ?? [];
  const objectiveSummary = objectivesByVersion.get(version.id) ?? { total: 0, verified: 0 };
  const expectedCoverageDimensions = Number.isInteger(version.provenance?.coveragePolicy?.expectedDimensions)
    && version.provenance.coveragePolicy.expectedDimensions > 0
    ? version.provenance.coveragePolicy.expectedDimensions
    : 29;
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
    expectedCoverageDimensions,
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
    expectedCoverageDimensions,
    sourceUrl: document?.url ?? source?.url ?? null,
    sourceAuthority: source?.authority ?? null,
    sourceAutoPromote: source?.auto_promote ?? null,
    documentStatus: document?.status ?? null,
    extractionStatus: document?.extraction_status ?? null,
    ingestion: {
      runsRecorded: sourceRuns.length,
      failedRuns: sourceRuns.filter((run) => run.status === "failed").length,
      latestStatus: latestRun?.status ?? null,
      latestStartedAt: latestRun?.started_at ?? null,
      latestCompletedAt: latestRun?.completed_at ?? null,
      latestError: latestRun?.error ?? null,
    },
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
    ingestionRuns: ingestionRuns.length,
    failedIngestionRuns: ingestionRuns.filter((run) => run.status === "failed").length,
    sourcesWithoutIngestionRuns: sources.filter((source) => !(runsBySource.get(source.id)?.length)).length,
  },
  versions: results,
};

console.log(JSON.stringify(report, null, 2));
if (process.argv.includes("--fail-on-blockers") && report.totals.blocked > 0) process.exitCode = 1;
