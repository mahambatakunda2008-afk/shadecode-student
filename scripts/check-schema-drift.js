#!/usr/bin/env node
/**
 * Cross-references every .from(<table>).select(<cols>) call in src/ against
 * a live Supabase schema snapshot, to catch the exact bug class found
 * during the 2026-08 audit: code and schema silently drifting apart (a
 * column the code reads/writes stops existing, or never existed, and
 * Supabase fails the whole query -- no crash, just wrong/empty data with
 * no error surfaced unless the caller happens to check .error).
 *
 * Real bugs this caught in one pass: user_profiles.tour_completed,
 * profiles.full_name, user_profiles.last_course_generated_at,
 * user_profiles.enrolled_courses. See docs/AUDIT_2026-08.md.
 *
 * This is NOT wired into CI -- it needs a live schema snapshot, and CI
 * doesn't have SUPABASE_SERVICE_ROLE_KEY (only the public anon key/URL).
 * Giving CI service-role DB access just to run a lint check would be a
 * bigger security tradeoff than this check is worth. Run it manually
 * during an audit/engineering session instead:
 *
 *   1. Fetch the schema snapshot via the Supabase MCP tools:
 *      execute_sql("select table_name, column_name from
 *      information_schema.columns where table_schema='public'")
 *   2. Reshape into { "table_name": ["col1","col2",...], ... } and save
 *      as schema-snapshot.json in the repo root (gitignored, scratch file).
 *   3. node scripts/check-schema-drift.js
 *
 * Known limitation: Supabase's join syntax (.select('*, relation(cols)'))
 * puts a relation/table name where a column name would be -- add any new
 * ones you hit to KNOWN_JOIN_RELATIONS below rather than treating them as
 * real findings.
 */

const fs = require("fs");
const path = require("path");

const SNAPSHOT_PATH = path.join(process.cwd(), "schema-snapshot.json");

const KNOWN_JOIN_RELATIONS = new Set([
  "syllabi", "skills", "careers", "past_papers", "profiles", "subjects",
]);

function loadSchema() {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    console.error(
      `No schema snapshot found at ${SNAPSHOT_PATH}.\n` +
      "This check needs a live schema snapshot -- see the header comment " +
      "in this file for how to generate one via the Supabase MCP tools."
    );
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8"));
  const schema = {};
  for (const [table, cols] of Object.entries(raw)) {
    schema[table] = new Set(cols);
  }
  return schema;
}

function scanCode(schema) {
  const pattern = /\.from\(\s*['"](\w+)['"]\s*\)[\s\S]{0,60}?\.select\(\s*['"]([^'"]+)['"]/g;
  const findings = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.(ts|tsx|js)$/.test(entry.name)) {
        const content = fs.readFileSync(full, "utf8");
        let m;
        while ((m = pattern.exec(content))) {
          const [, table, selectStr] = m;
          if (!schema[table]) continue;
          const cleaned = selectStr.replace(/\([^)]*\)/g, "");
          const cols = cleaned
            .split(",")
            .map((c) => c.trim().split(":").pop().trim())
            .filter((c) => c && c !== "*" && !c.startsWith("count"));
          const unknown = cols.filter(
            (c) => !schema[table].has(c) && !KNOWN_JOIN_RELATIONS.has(c)
          );
          if (unknown.length) {
            findings.push({ file: full, table, unknown });
          }
        }
      }
    }
  }

  walk("src");
  return findings;
}

const schema = loadSchema();
const findings = scanCode(schema);

if (findings.length === 0) {
  console.log("Schema-drift check: no issues found.");
  process.exit(0);
}

console.log(`Schema-drift check found ${findings.length} potential issue(s):\n`);
for (const f of findings) {
  console.log(`  ${f.file}: table=${f.table} unknown_columns=${JSON.stringify(f.unknown)}`);
}
console.log(
  "\nEach of these is either real drift (verify against the live DB before " +
  "fixing -- see docs/AUDIT_2026-08.md for the pattern) or a join-syntax " +
  "false positive (add the relation name to KNOWN_JOIN_RELATIONS)."
);
process.exit(1);
