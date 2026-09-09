import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const reportPath = process.env.CURRICULUM_WATCH_REPORT ?? ".curriculum-watch/latest-report.json";
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const report = JSON.parse(await readFile(reportPath, "utf8"));
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let documentsSeen = 0;
let documentsChanged = 0;
let changesCreated = 0;

for (const source of report.sources ?? []) {
  const { data: sourceRow, error: sourceError } = await supabase
    .from("curriculum_sources")
    .upsert({
      id: source.id,
      authority: source.authority,
      url: source.sourceUrl,
      last_checked_at: source.checkedAt,
      last_status: source.status,
    }, { onConflict: "id" })
    .select("id")
    .single();

  if (sourceError) throw new Error(`Source ${source.id}: ${sourceError.message}`);

  const runInsert = await supabase
    .from("curriculum_ingestion_runs")
    .insert({ source_id: sourceRow.id, status: "running", metadata: { watcherVersion: report.watcherVersion, runAt: report.runAt } })
    .select("id")
    .single();

  if (runInsert.error) throw new Error(`Run ${source.id}: ${runInsert.error.message}`);
  const runId = runInsert.data.id;

  try {
    for (const document of source.documents ?? []) {
      documentsSeen += 1;
      if (!document.contentHash) continue;

      const { data: previous } = await supabase
        .from("curriculum_documents")
        .select("id, content_hash, status")
        .eq("url", document.url)
        .maybeSingle();

      const changed = !previous || previous.content_hash !== document.contentHash;
      if (changed) documentsChanged += 1;

      const upsert = await supabase
        .from("curriculum_documents")
        .upsert({
          id: previous?.id,
          source_id: source.id,
          url: document.url,
          content_hash: document.contentHash,
          content_characters: document.characters ?? 0,
          last_seen_at: report.runAt,
          status: previous?.status === "verified" ? "verified" : "discovered",
        }, { onConflict: "url" })
        .select("id")
        .single();

      if (upsert.error) throw new Error(`Document ${document.url}: ${upsert.error.message}`);

      if (changed) {
        const change = await supabase.from("curriculum_ingestion_changes").insert({
          run_id: runId,
          document_id: upsert.data.id,
          change_type: previous ? "document_changed" : "document_added",
          before_value: previous ? { contentHash: previous.content_hash, status: previous.status } : null,
          after_value: { contentHash: document.contentHash, characters: document.characters ?? 0 },
          severity: previous ? "warning" : "info",
          requires_verification: true,
        });
        if (change.error) throw new Error(`Change ${document.url}: ${change.error.message}`);
        changesCreated += 1;
      }
    }

    const { error: finishError } = await supabase
      .from("curriculum_ingestion_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        documents_seen: source.documents?.length ?? 0,
        documents_changed: documentsChanged,
      })
      .eq("id", runId);
    if (finishError) throw new Error(`Finish ${source.id}: ${finishError.message}`);
  } catch (error) {
    await supabase.from("curriculum_ingestion_runs").update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    }).eq("id", runId);
    throw error;
  }
}

console.log(JSON.stringify({ report: reportPath, documentsSeen, documentsChanged, changesCreated }, null, 2));
