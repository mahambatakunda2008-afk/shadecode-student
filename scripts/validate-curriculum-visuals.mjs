import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const lessonRoot = path.join(root, "docs/curriculum/lessons");
const policyPath = path.join(root, "docs/curriculum/VISUAL_AND_MULTIMODAL_CONTENT_STANDARD.json");
const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
const allowedTypes = new Set(policy.assetTypes);
const requiredFields = policy.qualityGate.requiredFields;
const failures = [];

function collectJson(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? collectJson(full) : entry.isFile() && entry.name.endsWith(".json") ? [full] : [];
  });
}

for (const file of collectJson(lessonRoot)) {
  let lesson;
  try {
    lesson = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    failures.push(`${path.relative(root, file)}: invalid JSON (${String(error)})`);
    continue;
  }
  const relative = path.relative(root, file);
  if (!Array.isArray(lesson.learningObjectives) || lesson.learningObjectives.length === 0) {
    failures.push(`${relative}: missing learningObjectives`);
    continue;
  }
  if (lesson.visualReview?.status !== "reviewed_for_representation_coverage") {
    failures.push(`${relative}: missing visualReview coverage decision`);
  }
  if (!Array.isArray(lesson.visuals)) {
    failures.push(`${relative}: missing visuals array; explicitly review required representations`);
    continue;
  }
  const mapped = new Set();
  for (const [index, visual] of lesson.visuals.entries()) {
    for (const field of requiredFields) {
      if (visual[field] === undefined || visual[field] === null || visual[field] === "") {
        failures.push(`${relative}: visual[${index}] missing ${field}`);
      }
    }
    if (!allowedTypes.has(visual.type)) failures.push(`${relative}: visual[${index}] has unsupported type ${visual.type}`);
    if (!Array.isArray(visual.learningObjectiveIds) || visual.learningObjectiveIds.length === 0) {
      failures.push(`${relative}: visual[${index}] is not linked to a learning objective`);
    } else {
      visual.learningObjectiveIds.forEach((id) => mapped.add(id));
    }
    if (visual.offlineIncluded !== true) failures.push(`${relative}: visual[${index}] is not included offline`);
    if (typeof visual.altText !== "string" || visual.altText.trim().length < 20) failures.push(`${relative}: visual[${index}] needs meaningful altText`);
  }
  const code = lesson.identity?.syllabusCode;
  const subtopic = lesson.identity?.subtopic;
  lesson.learningObjectives.forEach((_, index) => {
    const expected = `${code}-AS-${subtopic}-LO${index + 1}`;
    if (!mapped.has(expected)) failures.push(`${relative}: learning objective ${expected} has no mapped visual/representation`);
  });
  if (lesson.offline?.networkRequired !== false) failures.push(`${relative}: lesson must declare networkRequired=false for offline pack`);
  if (!Array.isArray(lesson.offline?.assets)) failures.push(`${relative}: offline.assets registry missing`);
  else {
    for (const visual of lesson.visuals) {
      if (!lesson.offline.assets.some((asset) => asset.assetId === visual.assetId && asset.offlineIncluded === true)) {
        failures.push(`${relative}: ${visual.assetId} is missing from offline.assets`);
      }
    }
  }
}

if (failures.length) {
  console.error("Curriculum visual validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Curriculum visual validation passed for ${collectJson(lessonRoot).length} lesson pack(s).`);
}
