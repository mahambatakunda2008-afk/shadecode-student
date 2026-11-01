import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const DRAFT_ROOT = "docs/learning-assets/drafts";
const DEFAULT_OUT = "docs/learning-assets/prepared";

export function preparePublishedAsset(asset) {
  if (!asset || asset.asset_type !== "lesson" || asset.subject_id !== "biology") {
    throw new Error("Expected a Biology lesson draft asset.");
  }
  const curriculum = asset.curriculum ?? {};
  const source = curriculum.source_reference;
  if (curriculum.status !== "draft" || asset.review_status !== "draft") {
    throw new Error("Only explicitly draft Biology assets can be prepared.");
  }
  const sections = Array.isArray(asset.content?.sections) ? asset.content.sections : [];
  const questions = Array.isArray(asset.content?.questions) ? asset.content.questions : [];
  const visuals = Array.isArray(asset.content?.visual_assets) ? asset.content.visual_assets : [];
  if (!sections.length || !questions.length) throw new Error("Lesson sections and assessment questions are required.");

  return {
    curriculum_version_id: null,
    asset_key: asset.asset_key,
    asset_version: asset.asset_version,
    asset_type: "lesson",
    title: asset.title,
    subject_id: asset.subject_id,
    topic_key: curriculum.expected_topic_key,
    objective_keys: [],
    content: {
      learning_objectives: asset.content.learning_objectives ?? [],
      sections: sections.map(({ heading, body }) => ({ heading, body })),
      worked_examples: [],
      practice: questions.map((item) => ({
        question: item.question,
        answer: item.answer,
        indicative_mark_points: item.mark_points ?? [],
      })),
      visual_tasks: visuals.map((visual) => ({
        kind: "diagram",
        path: visual.path,
        alt: visual.alt,
        caption: visual.caption ?? "",
      })),
      source_outcome_codes: curriculum.syllabus_outcome_codes ?? [],
    },
    provenance: {
      source_reference: source ?? "",
      source_syllabus_version: curriculum.syllabus_version ?? "",
      mapping_status: "pending_verified_curriculum_and_objective_mapping",
    },
    quality_checks: {
      syllabus_checked: false,
      factual_accuracy_checked: false,
      assessment_checked: false,
      accessibility_checked: false,
      review_notes: [
        "Prepared from a draft package only. Requires verified curriculum-version and objective-key mapping plus independent editorial review."
      ],
    },
    preparation_status: "blocked_pending_verified_curriculum_mapping",
  };
}

async function main() {
  const args = process.argv.slice(2);
  const writeIndex = args.indexOf("--out");
  const outDir = writeIndex >= 0 ? args[writeIndex + 1] : null;
  if (writeIndex >= 0 && !outDir) throw new Error("--out requires a directory.");
  const files = (await readdir(DRAFT_ROOT)).filter((name) => /^biology-9700-.*\.json$/.test(name));
  const prepared = [];
  for (const file of files) {
    const asset = JSON.parse(await readFile(join(DRAFT_ROOT, file), "utf8"));
    prepared.push({ file, payload: preparePublishedAsset(asset) });
  }
  if (outDir) {
    await mkdir(outDir, { recursive: true });
    for (const item of prepared) {
      const name = basename(item.file).replace(/\.v1\.json$/, ".prepared.v1.json");
      await writeFile(join(outDir, name), JSON.stringify(item.payload, null, 2) + "\n", "utf8");
    }
  }
  console.log(JSON.stringify({
    mode: outDir ? "write-prepared-files" : "dry-run",
    packages: prepared.length,
    assets: prepared.map(({ file, payload }) => ({
      source: file,
      asset_key: payload.asset_key,
      topic_key: payload.topic_key,
      sections: payload.content.sections.length,
      practice_items: payload.content.practice.length,
      visual_tasks: payload.content.visual_tasks.length,
      curriculum_version_id: payload.curriculum_version_id,
      objective_keys: payload.objective_keys.length,
      status: payload.preparation_status,
    })),
    database_writes: 0,
    learner_publication: 0,
  }, null, 2));
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) await main();
