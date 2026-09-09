import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { diffObjectives } from "../src/lib/curriculum/change-intelligence.ts";
import { extractCurriculumKnowledge } from "../src/lib/curriculum/knowledge-extraction.ts";
import { getCurriculumExtractionProfile } from "../src/lib/curriculum/extraction-profiles.ts";

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
let documentsExtracted = 0;
let changesCreated = 0;
let versionsCreated = 0;
let knowledgeItemsCreated = 0;
let knowledgeAdded = 0;
let knowledgeChanged = 0;
let knowledgeRemoved = 0;
let objectivesAdded = 0;
let objectivesChanged = 0;
let objectivesRemoved = 0;
let extractionSkipped = 0;

function curriculumFromSource(source) {
  if (!source.qualificationId || !source.level || !source.syllabusId || !source.subjectId) {
    return null;
  }

  return {
    boardId: source.boardId,
    qualificationId: source.qualificationId,
    level: source.level,
    syllabusId: source.syllabusId,
    // A source may not publish its version in the landing-page registry.
    // "unversioned" remains draft-only and therefore cannot pass the resolver's
    // verified curriculum gate. A later verified document can replace it with
    // the actual syllabus version without rewriting this historical snapshot.
    syllabusVersion: source.syllabusVersion ?? "unversioned",
    subjectId: source.subjectId,
  };
}

function provenanceFor(source, document, sectionOrPage) {
  return {
    authority: source.authority,
    sourceDocument: document.url,
    sourceUrl: document.url,
    retrievedAt: report.runAt,
    ...(sectionOrPage ? { sectionOrPage } : {}),
    mappingStatus: "pending",
  };
}

function stableKnowledgeKey(item) {
  return [
    item.kind,
    item.code ?? "",
    item.title.trim().toLowerCase().replace(/\s+/g, " "),
  ].join("|");
}

function normalizedContent(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function dbObjectiveToDomain(row, curriculum, provenance) {
  return {
    id: row.id,
    code: row.objective_key,
    statement: row.description ?? row.title,
    status: row.status === "verified" ? "verified" : "draft",
    curriculum,
    provenance: row.provenance ?? provenance,
  };
}

for (const source of report.sources ?? []) {
  const { data: sourceRow, error: sourceError } = await supabase
    .from("curriculum_sources")
    .upsert({
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
    }, { onConflict: "id" })
    .select("id")
    .single();

  if (sourceError) throw new Error(`Source ${source.id}: ${sourceError.message}`);

  const runInsert = await supabase
    .from("curriculum_ingestion_runs")
    .insert({
      source_id: sourceRow.id,
      status: "running",
      metadata: {
        watcherVersion: report.watcherVersion,
        runAt: report.runAt,
        extractionMode: "whole-syllabus",
        curriculumIdentity: {
          boardId: source.boardId,
          qualificationId: source.qualificationId ?? null,
          level: source.level ?? null,
          syllabusId: source.syllabusId ?? null,
          syllabusVersion: source.syllabusVersion ?? null,
          subjectId: source.subjectId ?? null,
        },
      },
    })
    .select("id")
    .single();

  if (runInsert.error) throw new Error(`Run ${source.id}: ${runInsert.error.message}`);
  const runId = runInsert.data.id;
  let sourceDocumentsChanged = 0;
  let sourceObjectivesAdded = 0;
  let sourceObjectivesChanged = 0;
  let sourceObjectivesRemoved = 0;

  try {
    const curriculum = curriculumFromSource(source);

    for (const document of source.documents ?? []) {
      documentsSeen += 1;
      if (!document.contentHash) continue;

      const { data: previous } = await supabase
        .from("curriculum_documents")
        .select("id, content_hash, status, extracted_text")
        .eq("url", document.url)
        .maybeSingle();

      const changed = !previous || previous.content_hash !== document.contentHash;
      if (changed) {
        documentsChanged += 1;
        sourceDocumentsChanged += 1;
      }

      let extractedText = previous?.content_hash === document.contentHash
        ? previous.extracted_text
        : null;

      if (changed && document.textPath) {
        try {
          extractedText = await readFile(document.textPath, "utf8");
        } catch (error) {
          throw new Error(`Snapshot ${document.textPath}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      const upsert = await supabase
        .from("curriculum_documents")
        .upsert({
          id: previous?.id,
          source_id: source.id,
          url: document.url,
          title: document.title ?? null,
          content_hash: document.contentHash,
          content_characters: document.characters ?? extractedText?.length ?? 0,
          extracted_text: extractedText ?? null,
          last_seen_at: report.runAt,
          status: previous?.status === "verified" ? "verified" : changed ? "draft" : previous?.status ?? "discovered",
        }, { onConflict: "url" })
        .select("id")
        .single();

      if (upsert.error) throw new Error(`Document ${document.url}: ${upsert.error.message}`);
      if (!changed) continue;
      documentsExtracted += 1;

      const documentChange = await supabase.from("curriculum_ingestion_changes").insert({
        run_id: runId,
        document_id: upsert.data.id,
        change_type: previous ? "document_changed" : "document_added",
        before_value: previous ? { contentHash: previous.content_hash, status: previous.status } : null,
        after_value: { contentHash: document.contentHash, characters: document.characters ?? 0 },
        severity: previous ? "warning" : "info",
        requires_verification: true,
      });
      if (documentChange.error) throw new Error(`Document change ${document.url}: ${documentChange.error.message}`);
      changesCreated += 1;

      if (!curriculum || !extractedText) {
        extractionSkipped += 1;
        continue;
      }

      const profile = getCurriculumExtractionProfile(source.id);
      const provenance = provenanceFor(source, document);
      const extracted = extractCurriculumKnowledge(extractedText, curriculum, provenance, profile);

      if (!extracted.length) {
        extractionSkipped += 1;
        continue;
      }

      const { data: priorVersion } = await supabase
        .from("curriculum_versions")
        .select("id, syllabus_version, status, document_hash")
        .eq("board_id", curriculum.boardId)
        .eq("qualification_id", curriculum.qualificationId)
        .eq("syllabus_id", curriculum.syllabusId)
        .eq("subject_id", curriculum.subjectId)
        .neq("document_hash", document.contentHash)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let previousKnowledge = [];
      if (priorVersion) {
        const { data: priorRows, error: priorError } = await supabase
          .from("curriculum_knowledge")
          .select("id, kind, knowledge_key, title, content, status, provenance, objective_keys, topic_key")
          .eq("curriculum_version_id", priorVersion.id);
        if (priorError) throw new Error(`Prior knowledge ${priorVersion.id}: ${priorError.message}`);
        previousKnowledge = priorRows ?? [];
      }

      const previousByKey = new Map(previousKnowledge.map((row) => [
        row.knowledge_key ?? `${row.kind}|${row.title}`,
        row,
      ]));
      const currentKeys = new Set(extracted.map(stableKnowledgeKey));

      const versionInsert = await supabase
        .from("curriculum_versions")
        .insert({
          source_document_id: upsert.data.id,
          board_id: curriculum.boardId,
          qualification_id: curriculum.qualificationId,
          syllabus_id: curriculum.syllabusId,
          syllabus_version: curriculum.syllabusVersion,
          subject_id: curriculum.subjectId,
          status: "draft",
          provenance,
          document_hash: document.contentHash,
        })
        .select("id")
        .single();

      if (versionInsert.error) throw new Error(`Version ${document.url}: ${versionInsert.error.message}`);
      const versionId = versionInsert.data.id;
      versionsCreated += 1;

      const knowledgeRows = extracted.map((item) => ({
        id: item.id,
        curriculum_version_id: versionId,
        source_document_id: upsert.data.id,
        board_id: curriculum.boardId,
        qualification_id: curriculum.qualificationId,
        level: curriculum.level,
        syllabus_id: curriculum.syllabusId,
        syllabus_version: curriculum.syllabusVersion,
        subject_id: curriculum.subjectId,
        paper_component_id: item.identity.paperComponentId ?? null,
        kind: item.kind,
        knowledge_key: stableKnowledgeKey(item),
        title: item.title,
        content: item.content,
        parent_id: null,
        topic_key: item.topicCode ?? null,
        objective_keys: item.objectiveIds ?? [],
        status: "draft",
        provenance: item.provenance,
        metadata: item.metadata ?? {},
      }));

      const knowledgeInsert = await supabase.from("curriculum_knowledge").insert(knowledgeRows);
      if (knowledgeInsert.error) throw new Error(`Knowledge ${document.url}: ${knowledgeInsert.error.message}`);
      knowledgeItemsCreated += knowledgeRows.length;

      for (const item of extracted) {
        const key = stableKnowledgeKey(item);
        const previousItem = previousByKey.get(key);
        if (!previousItem) {
          knowledgeAdded += 1;
          await recordKnowledgeChange({
            runId,
            documentId: upsert.data.id,
            item,
            changeType: "knowledge_added",
            beforeValue: null,
            afterValue: { kind: item.kind, key, title: item.title, content: item.content },
            severity: "warning",
          });
          continue;
        }

        if (normalizedContent(previousItem.content) !== normalizedContent(item.content)) {
          knowledgeChanged += 1;
          await recordKnowledgeChange({
            runId,
            documentId: upsert.data.id,
            item,
            changeType: "knowledge_changed",
            beforeValue: { kind: previousItem.kind, key, title: previousItem.title, content: previousItem.content },
            afterValue: { kind: item.kind, key, title: item.title, content: item.content },
            severity: item.kind.includes("assessment") || item.kind === "examination_format" ? "critical" : "warning",
          });
        }
      }

      for (const previousItem of previousKnowledge) {
        const key = previousItem.knowledge_key ?? `${previousItem.kind}|${previousItem.title}`;
        if (currentKeys.has(key)) continue;
        knowledgeRemoved += 1;
        await recordKnowledgeChange({
          runId,
          documentId: upsert.data.id,
          item: null,
          changeType: "knowledge_removed",
          beforeValue: { kind: previousItem.kind, key, title: previousItem.title, content: previousItem.content },
          afterValue: null,
          severity: previousItem.kind.includes("assessment") || previousItem.kind === "examination_format" ? "critical" : "warning",
        });
      }

      const extractedObjectives = extracted
        .filter((item) => item.kind === "objective")
        .map((item) => ({
          id: item.id,
          code: item.code,
          statement: item.content,
          status: "draft",
          curriculum,
          provenance: item.provenance,
        }));

      if (extractedObjectives.length) {
        const priorObjectives = previousKnowledge
          .filter((row) => row.kind === "objective")
          .map((row) => dbObjectiveToDomain({
            id: row.id,
            objective_key: row.knowledge_key?.split("|")[1] || row.title,
            title: row.title,
            description: row.content,
            status: row.status,
            provenance: row.provenance,
          }, curriculum, provenance));
        const objectiveChanges = diffObjectives(priorObjectives, extractedObjectives);

        const objectiveRows = extractedObjectives.map((objective) => ({
          id: objective.id,
          curriculum_version_id: versionId,
          objective_key: objective.code,
          parent_key: objective.code?.includes(".") ? objective.code.split(".").slice(0, -1).join(".") : null,
          topic: null,
          title: objective.statement,
          description: objective.statement,
          education_level: curriculum.level,
          paper_component: null,
          status: "draft",
          provenance: objective.provenance,
        }));

        const objectiveInsert = await supabase.from("curriculum_objectives").insert(objectiveRows);
        if (objectiveInsert.error) throw new Error(`Objectives ${document.url}: ${objectiveInsert.error.message}`);

        for (const change of objectiveChanges) {
          if (change.type === "unchanged") continue;
          const dbType = change.type === "added" ? "objective_added"
            : change.type === "removed" ? "objective_removed"
            : "objective_changed";
          const key = change.current?.code ?? change.previous?.code ?? null;
          const changeInsert = await supabase.from("curriculum_ingestion_changes").insert({
            run_id: runId,
            document_id: upsert.data.id,
            objective_key: key,
            change_type: dbType,
            before_value: change.previous ? { code: change.previous.code, statement: change.previous.statement } : null,
            after_value: change.current ? { code: change.current.code, statement: change.current.statement, confidence: change.confidence, reason: change.reason } : null,
            severity: change.type === "removed" ? "critical" : "warning",
            requires_verification: change.requiresVerification,
          });
          if (changeInsert.error) throw new Error(`Objective change ${key}: ${changeInsert.error.message}`);
          changesCreated += 1;

          if (change.type === "added") {
            objectivesAdded += 1;
            sourceObjectivesAdded += 1;
          } else if (change.type === "removed") {
            objectivesRemoved += 1;
            sourceObjectivesRemoved += 1;
          } else {
            objectivesChanged += 1;
            sourceObjectivesChanged += 1;
          }
        }
      }
    }

    const { error: finishError } = await supabase
      .from("curriculum_ingestion_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        documents_seen: source.documents?.length ?? 0,
        documents_changed: sourceDocumentsChanged,
        objectives_added: sourceObjectivesAdded,
        objectives_changed: sourceObjectivesChanged,
        objectives_removed: sourceObjectivesRemoved,
        metadata: {
          extractionMode: "whole-syllabus",
          knowledgeItemsCreated,
          knowledgeAdded,
          knowledgeChanged,
          knowledgeRemoved,
        },
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

async function recordKnowledgeChange({ runId, documentId, item, changeType, beforeValue, afterValue, severity }) {
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
  if (result.error) throw new Error(`Knowledge change: ${result.error.message}`);
  changesCreated += 1;
}

console.log(JSON.stringify({
  report: reportPath,
  documentsSeen,
  documentsChanged,
  documentsExtracted,
  versionsCreated,
  knowledgeItemsCreated,
  knowledgeAdded,
  knowledgeChanged,
  knowledgeRemoved,
  objectivesAdded,
  objectivesChanged,
  objectivesRemoved,
  changesCreated,
  extractionSkipped,
}, null, 2));
