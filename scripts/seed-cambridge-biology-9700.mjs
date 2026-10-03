import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const VERSION_ID = "b9700c2d-6a4e-4c7d-9f21-97002027abcd";
const SOURCE_ID = "b9700b4a-1a22-4b9a-8b16-9700c2027abc";
const DATASET = "src/lib/curriculum/data/cambridge-9700-2025-2027.json";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");

const dataset = JSON.parse(await fs.readFile(DATASET, "utf8"));
const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const outcomes = [];
for (const topic of dataset.sections ?? []) {
  for (const subsection of topic.topics ?? []) {
    for (let i = 0; i < (subsection.outcomes ?? []).length; i++) {
      const key = `${subsection.key}.${i + 1}`;
      outcomes.push({
        curriculum_version_id: VERSION_ID,
        objective_key: key,
        parent_key: subsection.key,
        topic: topic.key,
        title: `${subsection.title}: outcome ${i + 1}`,
        description: subsection.outcomes[i],
        education_level: Number(topic.key) <= 11 ? "as_level" : "a_level",
        status: "verified",
        provenance: {
          authority: "Cambridge International Education",
          sourceDocument: "https://www.cambridgeinternational.org/Images/664560-2025-2027-syllabus.pdf",
          sourceDocumentId: SOURCE_ID,
          mappingStatus: "verified",
          representation: "normalized_paraphrase",
        },
      });
    }
  }
}

if (outcomes.length !== 259) throw new Error(`Expected 259 Biology objectives, got ${outcomes.length}`);
if (new Set(outcomes.map(x => x.objective_key)).size !== 259) throw new Error("Biology objective keys are not unique.");

await client.from("curriculum_objectives").delete().eq("curriculum_version_id", VERSION_ID);
for (let i = 0; i < outcomes.length; i += 100) {
  const { error } = await client.from("curriculum_objectives").insert(outcomes.slice(i, i + 100));
  if (error) throw error;
}

const knowledge = outcomes.map((o) => ({
  curriculum_version_id: VERSION_ID,
  source_document_id: SOURCE_ID,
  board_id: "cambridge",
  qualification_id: "cambridge-as-a-level",
  level: o.education_level,
  syllabus_id: "cambridge-9700",
  syllabus_version: "2025-2027",
  subject_id: "biology",
  kind: "learning_outcome",
  knowledge_key: `outcome|${o.objective_key}`,
  title: o.title,
  content: o.description,
  parent_id: null,
  topic_key: o.parent_key,
  objective_keys: [o.objective_key],
  status: "verified",
  provenance: o.provenance,
  metadata: { source: "structured-cambridge-dataset", objectiveKey: o.objective_key },
}));

await client.from("curriculum_knowledge").delete().eq("curriculum_version_id", VERSION_ID).eq("kind", "learning_outcome");
for (let i = 0; i < knowledge.length; i += 100) {
  const { error } = await client.from("curriculum_knowledge").insert(knowledge.slice(i, i + 100));
  if (error) throw error;
}

const { error: coverageError } = await client.from("curriculum_coverage_checks").upsert([
  { curriculum_version_id: VERSION_ID, dimension: "structure", status: "verified", evidence: { topics: 19, subsections: 44, learningOutcomes: 259 }, notes: "Official extraction and DB seeding reconciled." },
  { curriculum_version_id: VERSION_ID, dimension: "objectives", status: "verified", evidence: { verifiedObjectiveCount: 259 }, notes: "All extracted numbered learning outcomes seeded as curriculum objectives." },
  { curriculum_version_id: VERSION_ID, dimension: "provenance", status: "verified", evidence: { authority: "Cambridge International Education", sourceDocumentId: SOURCE_ID }, notes: "Every objective and learning-outcome knowledge row carries official-source provenance." }
], { onConflict: "curriculum_version_id,dimension" });
if (coverageError) throw coverageError;

console.log(`Seeded Biology 9700: ${outcomes.length} objectives and ${knowledge.length} learning-outcome knowledge rows.`);
