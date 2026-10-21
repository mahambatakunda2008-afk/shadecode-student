import { readFile } from "node:fs/promises";

const path = process.argv[2] ?? "docs/curriculum/official-source-intake-queue.json";
const queue = JSON.parse(await readFile(path, "utf8"));
const allowed = new Set([
  "source_confirmed_content_not_ingested",
  "source_discovery_required",
  "blocked_source_access",
  "normalized_pending_review",
]);
const required = ["id", "boardId", "authority", "qualification", "level", "subject", "syllabusId", "syllabusVersion", "officialAuthorityPage", "status", "priority", "requiredChecks"];
const errors = [];
const seen = new Set();

if (queue.schemaVersion !== 1 || !Array.isArray(queue.items) || !queue.statusVocabulary) {
  errors.push("Queue must use schemaVersion 1 and include items + statusVocabulary.");
}
for (const [index, item] of (queue.items ?? []).entries()) {
  for (const key of required) {
    if (item[key] === undefined || item[key] === null || item[key] === "") errors.push(`items[${index}] missing ${key}`);
  }
  if (seen.has(item.id)) errors.push(`Duplicate id: ${item.id}`);
  seen.add(item.id);
  if (!allowed.has(item.status)) errors.push(`${item.id}: unsupported status ${item.status}`);
  if (!/^https:\/\//.test(item.officialAuthorityPage ?? "")) errors.push(`${item.id}: authority page must be HTTPS`);
  if (item.sourceDocumentUrl && !/^https:\/\//.test(item.sourceDocumentUrl)) errors.push(`${item.id}: source document URL must be HTTPS`);
  if (!Array.isArray(item.level) || !item.level.length) errors.push(`${item.id}: level must be a non-empty array`);
  if (!Array.isArray(item.requiredChecks) || !item.requiredChecks.length) errors.push(`${item.id}: requiredChecks must be a non-empty array`);
  if (!Number.isInteger(item.priority) || item.priority < 1) errors.push(`${item.id}: priority must be a positive integer`);
  if (item.status === "source_confirmed_content_not_ingested" && !item.sourceDocumentUrl) {
    errors.push(`${item.id}: confirmed source status requires an exact sourceDocumentUrl`);
  }
}
const priorities = (queue.items ?? []).map(x => x.priority);
if (new Set(priorities).size !== priorities.length) errors.push("Priority values must be unique.");

if (errors.length) {
  console.error("Curriculum source queue validation failed:");
  for (const error of errors) console.error("- " + error);
  process.exitCode = 1;
} else {
  console.log(`Validated ${queue.items.length} intake items across ${new Set(queue.items.map(x => x.boardId)).size} board/authority IDs.`);
  console.log("Queue entries are intake metadata only; this check does not certify syllabus completeness.");
}
