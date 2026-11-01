import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const DRAFT_ROOT = "docs/learning-assets/drafts";
const PUBLIC_ROOT = resolve("public");

export function validateBiologyDraftAsset(asset, fileName = "asset.json") {
  const errors = [];
  const require = (condition, message) => { if (!condition) errors.push(`${fileName}: ${message}`); };
  require(asset && typeof asset === "object" && !Array.isArray(asset), "root must be an object");
  if (!asset || typeof asset !== "object" || Array.isArray(asset)) return errors;
  require(/^biology-9700-[a-z0-9-]+$/.test(asset.asset_key ?? ""), "asset_key must identify a Biology 9700 asset");
  require(Number.isInteger(asset.asset_version) && asset.asset_version > 0, "asset_version must be a positive integer");
  require(asset.asset_type === "lesson", "asset_type must be lesson");
  require(asset.subject_id === "biology", "subject_id must be biology");
  require(asset.review_status === "draft", "review_status must remain draft");
  const curriculum = asset.curriculum ?? {};
  require(curriculum.board_id === "cambridge", "curriculum.board_id must be cambridge");
  require(curriculum.qualification_id === "cambridge-as-a-level", "qualification_id must be cambridge-as-a-level");
  require(curriculum.syllabus_id === "cambridge-9700", "syllabus_id must be cambridge-9700");
  require(curriculum.syllabus_version === "2028-2030", "syllabus_version must be 2028-2030");
  require(curriculum.status === "draft", "curriculum.status must remain draft");
  require(curriculum.objective_mapping_status === "unmapped_to_database_objective_uuids", "objective UUID mapping must remain explicitly unmapped");
  require(typeof curriculum.expected_topic_key === "string" && /^\d+$/.test(curriculum.expected_topic_key), "expected_topic_key must be a numeric topic key");
  require(typeof curriculum.source_reference === "string" && curriculum.source_reference.includes("744622-2028-2030-syllabus.pdf"), "source_reference must cite the controlling 2028-2030 syllabus");
  const codes = curriculum.syllabus_outcome_codes;
  require(Array.isArray(codes) && codes.length > 0, "syllabus_outcome_codes must be non-empty");
  if (Array.isArray(codes)) {
    require(new Set(codes).size === codes.length, "syllabus outcome codes must be unique");
    for (const code of codes) require(typeof code === "string" && code.startsWith(curriculum.expected_topic_key + "."), `outcome ${code} must belong to topic ${curriculum.expected_topic_key}`);
  }
  const content = asset.content ?? {};
  require(Array.isArray(content.learning_objectives) && content.learning_objectives.length > 0, "learning_objectives must be non-empty");
  require(Array.isArray(content.sections) && content.sections.length > 0, "sections must be non-empty");
  if (Array.isArray(content.sections)) {
    for (const [i, section] of content.sections.entries()) {
      require(typeof section.heading === "string" && section.heading.trim().length >= 4, `sections[${i}] needs a meaningful heading`);
      require(typeof section.body === "string" && section.body.trim().length >= 80, `sections[${i}] needs substantive explanatory text (at least 80 characters)`);
    }
  }
  require(Array.isArray(content.questions) && content.questions.length > 0, "questions must be non-empty");
  if (Array.isArray(content.questions)) {
    for (const [i, q] of content.questions.entries()) {
      require(typeof q.question === "string" && q.question.trim().length > 20, `questions[${i}] needs a complete prompt`);
      require(typeof q.answer === "string" && q.answer.trim().length > 20, `questions[${i}] needs an explanatory answer`);
      require(Array.isArray(q.mark_points) && q.mark_points.length > 0 && q.mark_points.every(p => typeof p === "string" && p.trim()), `questions[${i}] needs indicative mark points`);
    }
  }
  require(asset.quality_checks?.syllabus_checked === false, "syllabus_checked must remain false until independent review");
  require(asset.quality_checks?.factual_accuracy_checked === false, "factual_accuracy_checked must remain false until independent review");
  require(asset.quality_checks?.assessment_checked === false, "assessment_checked must remain false until independent review");
  require(asset.quality_checks?.accessibility_checked === false, "accessibility_checked must remain false until independent review");
  return errors;
}

export function validateVisualAsset(visual, fileName = "asset.json") {
  const errors = [];
  if (typeof visual?.path !== "string" || !visual.path.startsWith("/")) return [`${fileName}: visual path must be an absolute public asset path`];
  const relative = visual.path.slice(1);
  const target = resolve(PUBLIC_ROOT, relative);
  if (target !== PUBLIC_ROOT && !target.startsWith(PUBLIC_ROOT + sep)) errors.push(`${fileName}: visual path escapes public/`);
  else if (!existsSync(target)) errors.push(`${fileName}: referenced visual does not exist: ${visual.path}`);
  else if (!/\.svg$/i.test(target)) errors.push(`${fileName}: only reviewed SVG visuals are currently accepted by this validator`);
  else {
    // Read is handled by the async directory runner below; this check protects path/type.
  }
  if (typeof visual.alt !== "string" || visual.alt.trim().length < 20) errors.push(`${fileName}: visual alt text must be descriptive (at least 20 characters)`);
  return errors;
}

async function main() {
  const files = process.argv.slice(2);
  const candidates = files.length ? files : (await readdir(DRAFT_ROOT)).filter(name => /^biology-9700-.*\.json$/.test(name)).map(name => join(DRAFT_ROOT, name));
  let checked = 0;
  const errors = [];
  for (const path of candidates) {
    let asset;
    try { asset = JSON.parse(await readFile(path, "utf8")); }
    catch (error) { errors.push(`${path}: invalid JSON: ${error.message}`); continue; }
    checked++;
    errors.push(...validateBiologyDraftAsset(asset, path));
    for (const visual of asset.content?.visual_assets ?? []) {
      errors.push(...validateVisualAsset(visual, path));
      if (typeof visual.path === "string" && visual.path.startsWith("/")) {
        const target = resolve(PUBLIC_ROOT, visual.path.slice(1));
        if (target.startsWith(PUBLIC_ROOT + sep) && existsSync(target) && /\.svg$/i.test(target)) {
          const svg = await readFile(target, "utf8");
          if (!/<svg(?:\s|>)/i.test(svg)) errors.push(`${path}: referenced visual is not valid SVG markup: ${visual.path}`);
        }
      }
    }
  }
  if (errors.length) {
    console.error("Biology draft asset validation failed:");
    for (const error of errors) console.error("- " + error);
    process.exitCode = 1;
  } else {
    console.log(`Validated ${checked} Biology 9700 draft lesson package(s). This is a structural gate only; it does not certify scientific accuracy, syllabus completeness or publication readiness.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
