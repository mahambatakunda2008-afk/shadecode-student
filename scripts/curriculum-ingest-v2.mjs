import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { diffCurriculumKnowledge, knowledgeKey } from "../src/lib/curriculum/knowledge-change-intelligence.ts";
import { diffObjectives } from "../src/lib/curriculum/change-intelligence.ts";
import { extractCurriculumKnowledge } from "../src/lib/curriculum/knowledge-extraction.ts";
import { getCurriculumExtractionProfile } from "../src/lib/curriculum/extraction-profiles.ts";

const reportPath = process.env.CURRICULUM_WATCH_REPORT ?? ".curriculum-watch/latest-report.json";
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

const report = JSON.parse(await readFile(reportPath, "utf8"));
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

let documentsSeen = 0, documentsChanged = 0, documentsExtracted = 0;
let changesCreated = 0, versionsCreated = 0, knowledgeItemsCreated = 0;
let knowledgeAdded = 0, knowledgeChanged = 0, knowledgeRemoved = 0, knowledgeMoved = 0, knowledgeRenamed = 0;
let objectivesAdded = 0, objectivesChanged = 0, objectivesRemoved = 0, extractionSkipped = 0;

function curriculumFromSource(source, document) {
  if (!source.qualificationId || !source.level || !source.syllabusId || !source.subjectId) return null;
  const discovered = document.syllabusVersion ?? null;
  const configured = source.syllabusVersion ?? null;
  const version = discovered || configured || "unversioned";
  const conflict = Boolean(discovered && configured && discovered !== configured);
  return {
    curriculum: {
      boardId: source.boardId,
      qualificationId: source.qualificationId,
      level: source.level,
      syllabusId: source.syllabusId,
      syllabusVersion: version,
      subjectId: source.subjectId,
    },
    conflict,
    configuredVersion: configured,
    discoveredVersion: discovered,
  };
}

function provenanceFor(source, document, extra = {}) {
  return {
    authority: source.authority,
    sourceDocument: document.url,
    sourceUrl: document.url,
    retrievedAt: report.runAt,
    ...(document.syllabusVersionEvidence?.length ? { versionEvidence: document.syllabusVersionEvidence } : {}),
    ...(document.syllabusVersionSource ? { versionSource: document.syllabusVersionSource } : {}),
    ...(extra.sectionOrPage ? { sectionOrPage: extra.sectionOrPage } : {}),
    ...(extra.versionConflict ? { versionConflict: true } : {}),
    mappingStatus: "pending",
  };
}

function normalizedContent(value) { return value.trim().toLowerCase().replace(/\s+/g, " "); }
function isCritical(item) { return item.kind.includes("assessment") || item.kind === "examination_format" || item.kind === "paper_component"; }

async function recordChange(runId, documentId, item, changeType, beforeValue, afterValue, severity = "warning") {
  const result = await supabase.from("curriculum_ingestion_changes").insert({
    run_id: runId,
    document_id: documentId,
    objective_key: item?.code ?? null,
    change_type: changeType,
    before_value: beforeValue,
    after_value: afterValue,
    severity,
    requires_verification: true,
  });
  if (result.error) throw new Error(`Change ${changeType}: ${result.error.message}`);
  changesCreated += 1;
}

for (const source of report.sources ?? []) {
  const { data: sourceRow, error: sourceError } = await supabase.from("curriculum_sources").upsert({
    id: source.id,
    board_id: source.boardId,
    qualification_id: source.qualificationId ?? null,
    subject_id: source.subjectId ?? null,
    level: source.level ?? null,
    syllabus_id: source.syllabusId ?? null,
    syllabus_version: source.syllabusVersion ?? null,
    authority: source.authority,
    kind: source.kind,
    url: source.sourceUrl,
    last_checked_at: source.checkedAt,
    last_status: source.status,
  }, { onConflict: "id" }).select("id").single();
  if (sourceError) throw new Error(`Source ${source.id}: ${sourceError.message}`);

  const runInsert = await supabase.from("curriculum_ingestion_runs").insert({
    source_id: sourceRow.id,
    status: "running",
    metadata: { watcherVersion: report.watcherVersion, runAt: report.runAt, extractionMode: "whole-syllabus-v2" },
  }).select("id").single();
  if (runInsert.error) throw new Error(`Run ${source.id}: ${runInsert.error.message}`);
  const runId = runInsert.data.id;
  let sourceDocumentsChanged = 0, sourceObjectivesAdded = 0, sourceObjectivesChanged = 0, sourceObjectivesRemoved = 0;

  try {
    for (const document of source.documents ?? []) {
      documentsSeen += 1;
      if (!document.contentHash) continue;
      const { data: previous, error: previousError } = await supabase.from("curriculum_documents")
        .select("id, content_hash, status, extracted_text").eq("url", document.url).maybeSingle();
      if (previousError) throw new Error(`Document lookup ${document.url}: ${previousError.message}`);

      const changed = !previous || previous.content_hash !== document.contentHash;
      if (changed) { documentsChanged += 1; sourceDocumentsChanged += 1; }
      let extractedText = previous?.content_hash === document.contentHash ? previous.extracted_text : null;
      if (changed && document.textPath) extractedText = await readFile(document.textPath, "utf8");

      const upsert = await supabase.from("curriculum_documents").upsert({
        id: previous?.id,
        source_id: source.id,
        url: document.url,
        title: document.title ?? null,
        content_hash: document.contentHash,
        content_characters: document.characters ?? extractedText?.length ?? 0,
        extracted_text: extractedText ?? null,
        last_seen_at: report.runAt,
        status: previous?.status === "verified" ? "verified" : changed ? "draft" : previous?.status ?? "discovered",
      }, { onConflict: "url" }).select("id").single();
      if (upsert.error) throw new Error(`Document ${document.url}: ${upsert.error.message}`);
      if (!changed) continue;
      documentsExtracted += 1;

      await recordChange(runId, upsert.data.id, null, previous ? "document_changed" : "document_added",
        previous ? { contentHash: previous.content_hash, status: previous.status } : null,
        { contentHash: document.contentHash, characters: document.characters ?? 0, syllabusVersion: document.syllabusVersion ?? null },
        previous ? "warning" : "info");

      const resolved = curriculumFromSource(source, document);
      if (!resolved || !extractedText) { extractionSkipped += 1; continue; }
      const provenance = provenanceFor(source, document, { versionConflict: resolved.conflict });
      const profile = getCurriculumExtractionProfile(source.id);
      const extracted = extractCurriculumKnowledge(extractedText, resolved.curriculum, provenance, profile);
      if (!extracted.length) { extractionSkipped += 1; continue; }

      const { data: priorVersion } = await supabase.from("curriculum_versions")
        .select("id, syllabus_version, status, document_hash, created_at")
        .eq("board_id", resolved.curriculum.boardId)
        .eq("qualification_id", resolved.curriculum.qualificationId)
        .eq("syllabus_id", resolved.curriculum.syllabusId)
        .eq("subject_id", resolved.curriculum.subjectId)
        .eq("syllabus_version", resolved.curriculum.syllabusVersion)
        .neq("document_hash", document.contentHash)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();

      let previousKnowledge = [];
      if (priorVersion) {
        const { data: rows, error } = await supabase.from("curriculum_knowledge")
          .select("id, kind, code, knowledge_key, title, content, status, provenance, objective_keys, topic_key, parent_id, paper_component_id, board_id, qualification_id, level, syllabus_id, syllabus_version, subject_id")
          .eq("curriculum_version_id", priorVersion.id);
        if (error) throw new Error(`Prior knowledge ${priorVersion.id}: ${error.message}`);
        previousKnowledge = (rows ?? []).map((row) => ({
          id: row.id, kind: row.kind, code: row.code ?? row.knowledge_key?.split("|")[1], title: row.title, content: row.content,
          status: row.status, identity: { boardId: row.board_id, qualificationId: row.qualification_id, level: row.level, syllabusId: row.syllabus_id, syllabusVersion: row.syllabus_version, subjectId: row.subject_id, paperComponentId: row.paper_component_id ?? undefined },
          provenance: row.provenance, objectiveIds: row.objective_keys ?? [], topicCode: row.topic_key ?? undefined, parentId: row.parent_id ?? undefined,
        }));
      }

      const versionInsert = await supabase.from("curriculum_versions").insert({
        source_document_id: upsert.data.id,
        board_id: resolved.curriculum.boardId,
        qualification_id: resolved.curriculum.qualificationId,
        syllabus_id: resolved.curriculum.syllabusId,
        syllabus_version: resolved.curriculum.syllabusVersion,
        subject_id: resolved.curriculum.subjectId,
        status: "draft",
        provenance,
        document_hash: document.contentHash,
      }).select("id").single();
      if (versionInsert.error) throw new Error(`Version ${document.url}: ${versionInsert.error.message}`);
      const versionId = versionInsert.data.id;
      versionsCreated += 1;

      const rows = extracted.map((item) => ({
        id: item.id,
        curriculum_version_id: versionId,
        source_document_id: upsert.data.id,
        board_id: resolved.curriculum.boardId,
        qualification_id: resolved.curriculum.qualificationId,
        level: resolved.curriculum.level,
        syllabus_id: resolved.curriculum.syllabusId,
        syllabus_version: resolved.curriculum.syllabusVersion,
        subject_id: resolved.curriculum.subjectId,
        paper_component_id: item.identity.paperComponentId ?? null,
        kind: item.kind,
        knowledge_key: knowledgeKey(item),
        title: item.title,
        content: item.content,
        parent_id: item.parentId ?? null,
        topic_key: item.topicCode ?? null,
        objective_keys: item.objectiveIds ?? [],
        status: "draft",
        provenance: item.provenance,
        metadata: { ...(item.metadata ?? {}), versionConflict: resolved.conflict },
      }));
      const insert = await supabase.from("curriculum_knowledge").insert(rows);
      if (insert.error) throw new Error(`Knowledge ${document.url}: ${insert.error.message}`);
      knowledgeItemsCreated += rows.length;

      const knowledgeChanges = diffCurriculumKnowledge(previousKnowledge, extracted);
      for (const change of knowledgeChanges) {
        if (change.type === "unchanged") continue;
        const severity = isCritical(change.current ?? change.previous ?? extracted[0]) ? "critical" : "warning";
        await recordChange(runId, upsert.data.id, change.current ?? change.previous ?? null,
          `knowledge_${change.type}`,
          change.previous ? { key: knowledgeKey(change.previous), title: change.previous.title, content: change.previous.content, parentId: change.previous.parentId ?? null } : null,
          change.current ? { key: knowledgeKey(change.current), title: change.current.title, content: change.current.content, parentId: change.current.parentId ?? null } : null,
          severity);
        if (change.type === "added") knowledgeAdded += 1;
        if (change.type === "removed") knowledgeRemoved += 1;
        if (change.type === "modified" || change.type === "relationship_changed") knowledgeChanged += 1;
        if (change.type === "moved") knowledgeMoved += 1;
        if (change.type === "possible_rename") knowledgeRenamed += 1;
      }

      const extractedObjectives = extracted.filter((item) => item.kind === "objective").map((item) => ({
        id: item.id, code: item.code, statement: item.content, status: "draft", curriculum: resolved.curriculum, provenance: item.provenance,
      }));
      if (extractedObjectives.length) {
        const priorObjectives = previousKnowledge.filter((row) => row.kind === "objective").map((row) => ({
          id: row.id, code: row.code, statement: row.content, status: row.status === "verified" ? "verified" : "draft", curriculum: resolved.curriculum, provenance: row.provenance,
        }));
        const objectiveChanges = diffObjectives(priorObjectives, extractedObjectives);
        const objectiveRows = extractedObjectives.map((objective) => ({
          id: objective.id, curriculum_version_id: versionId, objective_key: objective.code,
          parent_key: objective.code?.includes(".") ? objective.code.split(".").slice(0, -1).join(".") : null,
          topic: null, title: objective.statement, description: objective.statement, education_level: resolved.curriculum.level,
          paper_component: null, status: "draft", provenance: objective.provenance,
        }));
        const objectiveInsert = await supabase.from("curriculum_objectives").insert(objectiveRows);
        if (objectiveInsert.error) throw new Error(`Objectives ${document.url}: ${objectiveInsert.error.message}`);
        for (const change of objectiveChanges) {
          if (change.type === "unchanged") continue;
          const type = change.type === "added" ? "objective_added" : change.type === "removed" ? "objective_removed" : "objective_changed";
          await recordChange(runId, upsert.data.id, change.current ?? change.previous ?? null, type,
            change.previous ? { code: change.previous.code, statement: change.previous.statement } : null,
            change.current ? { code: change.current.code, statement: change.current.statement, confidence: change.confidence, reason: change.reason } : null,
            change.type === "removed" ? "critical" : "warning");
          if (change.type === "added") { objectivesAdded += 1; sourceObjectivesAdded += 1; }
          else if (change.type === "removed") { objectivesRemoved += 1; sourceObjectivesRemoved += 1; }
          else { objectivesChanged += 1; sourceObjectivesChanged += 1; }
        }
      }
    }

    const finish = await supabase.from("curriculum_ingestion_runs").update({
      status: "completed", completed_at: new Date().toISOString(), documents_seen: source.documents?.length ?? 0,
      documents_changed: sourceDocumentsChanged, objectives_added: sourceObjectivesAdded, objectives_changed: sourceObjectivesChanged,
      objectives_removed: sourceObjectivesRemoved,
      metadata: { extractionMode: "whole-syllabus-v2", versionsCreated, knowledgeItemsCreated, knowledgeAdded, knowledgeChanged, knowledgeRemoved, knowledgeMoved, knowledgeRenamed },
    }).eq("id", runId);
    if (finish.error) throw new Error(`Finish ${source.id}: ${finish.error.message}`);
  } catch (error) {
    await supabase.from("curriculum_ingestion_runs").update({ status: "failed", completed_at: new Date().toISOString(), error: error instanceof Error ? error.message : String(error) }).eq("id", runId);
    throw error;
  }
}

console.log(JSON.stringify({ report: reportPath, documentsSeen, documentsChanged, documentsExtracted, versionsCreated, knowledgeItemsCreated, knowledgeAdded, knowledgeChanged, knowledgeRemoved, knowledgeMoved, knowledgeRenamed, objectivesAdded, objectivesChanged, objectivesRemoved, changesCreated, extractionSkipped }, null, 2));
