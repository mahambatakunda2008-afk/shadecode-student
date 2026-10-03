import { createClient } from "@supabase/supabase-js";

const VERSION_ID = "b9700c2d-6a4e-4c7d-9f21-97002027abcd";
const EXPECTED = 259;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");

const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: objectives, error: objectiveError } = await client
  .from("curriculum_objectives")
  .select("objective_key, parent_key, topic, status, provenance")
  .eq("curriculum_version_id", VERSION_ID);
if (objectiveError) throw objectiveError;

const { data: knowledge, error: knowledgeError } = await client
  .from("curriculum_knowledge")
  .select("knowledge_key, topic_key, objective_keys, status, provenance")
  .eq("curriculum_version_id", VERSION_ID)
  .eq("kind", "learning_outcome");
if (knowledgeError) throw knowledgeError;

const keys = new Set((objectives ?? []).map((row) => row.objective_key));
const knowledgeKeys = new Set((knowledge ?? []).map((row) => row.knowledge_key));
const failures = [];
if ((objectives ?? []).length !== EXPECTED) failures.push(`expected ${EXPECTED} objectives, got ${objectives?.length ?? 0}`);
if ((knowledge ?? []).length !== EXPECTED) failures.push(`expected ${EXPECTED} learning-outcome knowledge rows, got ${knowledge?.length ?? 0}`);
if (keys.size !== (objectives ?? []).length) failures.push("objective keys are not unique");
if (knowledgeKeys.size !== (knowledge ?? []).length) failures.push("knowledge keys are not unique");

for (const row of objectives ?? []) {
  if (row.status !== "verified") failures.push(`objective ${row.objective_key} is not verified`);
  if (!row.parent_key) failures.push(`objective ${row.objective_key} has no subsection parent`);
  if (!row.provenance?.sourceDocumentId) failures.push(`objective ${row.objective_key} has no sourceDocumentId provenance`);
  if (row.provenance?.representation !== "official_extraction") failures.push(`objective ${row.objective_key} has incorrect representation metadata`);
  const expectedKnowledgeKey = `outcome|${row.objective_key}`;
  if (!knowledgeKeys.has(expectedKnowledgeKey)) failures.push(`missing knowledge row for ${row.objective_key}`);
}

for (const row of knowledge ?? []) {
  const objectiveKey = Array.isArray(row.objective_keys) ? row.objective_keys[0] : null;
  if (!objectiveKey || !keys.has(objectiveKey)) failures.push(`orphan knowledge row ${row.knowledge_key}`);
  if (row.status !== "verified") failures.push(`knowledge ${row.knowledge_key} is not verified`);
  if (row.provenance?.representation !== "official_extraction") failures.push(`knowledge ${row.knowledge_key} has incorrect representation metadata`);
}

if (failures.length) {
  console.error("Biology 9700 DB verification FAILED");
  for (const failure of failures.slice(0, 50)) console.error(`- ${failure}`);
  if (failures.length > 50) console.error(`- ...and ${failures.length - 50} more`);
  process.exit(1);
}

console.log(`Biology 9700 DB verification PASSED: ${objectives.length} objectives and ${knowledge.length} learning-outcome knowledge rows reconciled.`);
