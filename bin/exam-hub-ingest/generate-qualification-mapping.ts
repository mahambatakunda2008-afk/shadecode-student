/**
 * bin/exam-hub-ingest/generate-qualification-mapping.ts
 *
 * Scan local official Cambridge syllabus PDF files and generate a canonical
 * qualification -> paper-number mapping suitable for ingestion.
 *
 * Usage (preview only):
 *   npx tsx bin/exam-hub-ingest/generate-qualification-mapping.ts <syllabi-folder>
 *
 * To write mappings to Supabase DB (qualification_mappings table) or to
 * file, provide --apply and ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * are set in the environment.
 *
 * Notes:
 * - This is intentionally conservative. It will NOT guess. If ambiguous or
 *   no authoritative sentence is found for a paper, the syllabus will be
 *   reported as unresolved and skipped.
 * - The script requires `pdf-parse` to extract text from PDFs. Install with:
 *     npm install pdf-parse
 */

import fs from "fs";
import path from "path";

type Mapping = Record<string, Record<string, string>>; // syllabusId -> (paperNumber|string("null") -> level)

async function extractTextFromPdf(filePath: string): Promise<string> {
  // Lazy-import pdf-parse to avoid hard dependency until runtime
  let pdfParse: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    pdfParse = require("pdf-parse");
  } catch (e) {
    throw new Error(
      "Missing dependency 'pdf-parse'. Install it with `npm install pdf-parse` and re-run this script."
    );
  }
  const data = fs.readFileSync(filePath);
  const res = await pdfParse(data);
  return res.text as string;
}

function findSyllabusIdFromFilename(filename: string): string | null {
  const b = path.basename(filename);
  const m = /^([0-9]{4,})/i.exec(b);
  return m ? m[1] : null;
}

function parseMappingFromText(text: string): Map<number, string> {
  // Conservative parser: look for sentences that explicitly state which papers are AS or A level.
  // Examples it understands:
  //  - "Papers 1 and 2 are AS Level."
  //  - "Paper 5 is A Level."
  //  - "Papers 5, 6 are A Level." (comma-separated)
  //  - "Grade thresholds (GT) and inserts (IN)" -> treated separately

  const map = new Map<number, string>();
  const normalized = text.replace(/\r/g, "\n");
  // Split into lines and sentences
  const candidates = normalized.split(/[\n\.\r]+/).map((s) => s.trim()).filter(Boolean);

  const paperRangeRegex = /Papers?\s+([0-9\s,\-and]+)\s+are\s+(AS|A)\s*Level/iu; // captures numbers and 'AS' or 'A'
  const paperIsRegex = /Paper\s+([0-9]+)\s+is\s+(AS|A)\s*Level/iu;
  const papersAreRegex = /Papers?\s+([0-9,\sand-]+)\s+are\s+(AS|A)\s*Level/iu;

  for (const s of candidates) {
    let m = paperIsRegex.exec(s) || paperRangeRegex.exec(s) || papersAreRegex.exec(s);
    if (!m) continue;
    // m[1] numbers, m[2] level
    const numsStr = m[1];
    const levelCode = (m[2] || m[2]) as string;
    const level = levelCode.toUpperCase() === "AS" ? "AS Level" : "A Level";
    // parse numbers (accept ranges, commas, and 'and')
    const parts = numsStr.split(/[,\s]+/).map((p) => p.replace(/and/gi, "").replace(/\-+/g, "-").trim()).filter(Boolean);
    for (const part of parts) {
      if (/^[0-9]+$/.test(part)) {
        map.set(Number(part), level);
      } else if (/^([0-9]+)-([0-9]+)$/.test(part)) {
        const rm = /^([0-9]+)-([0-9]+)$/.exec(part)!;
        const start = Number(rm[1]);
        const end = Number(rm[2]);
        for (let i = start; i <= end; i++) map.set(i, level);
      }
    }
  }

  return map;
}

function findGradeThresholdOrInsert(text: string): string | null {
  // Try to detect whether GT/IN belong to AS or A level. Look for lines mentioning "Grade thresholds" or "Inserts"
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const m = /(Grade thresholds|Grade threshold|GT)\b[\s\S]*?(AS|A)\s*Level/iu.exec(line);
    if (m) {
      const level = m[2].toUpperCase() === "AS" ? "AS Level" : "A Level";
      return level;
    }
    const m2 = /(Insert|Inserts|IN)\b[\s\S]*?(AS|A)\s*Level/iu.exec(line);
    if (m2) {
      return m2[2].toUpperCase() === "AS" ? "AS Level" : "A Level";
    }
  }
  return null;
}

async function generateMappingsFromFolder(folder: string): Promise<Mapping> {
  const entries = fs.readdirSync(folder);
  const mapping: Mapping = {};
  for (const e of entries) {
    const full = path.join(folder, e);
    const stat = fs.statSync(full);
    if (!stat.isFile()) continue;
    const ext = path.extname(full).toLowerCase();
    if (ext !== ".pdf") continue;

    const syllabusId = findSyllabusIdFromFilename(e);
    if (!syllabusId) {
      console.warn(`Skipping PDF without identifiable syllabus id in filename: ${e}`);
      continue;
    }

    console.log(`Processing ${e} (syllabus ${syllabusId})...`);
    let text: string;
    try {
      text = await extractTextFromPdf(full);
    } catch (err) {
      console.error(`Failed to extract text from ${e}: ${(err as Error).message}`);
      continue;
    }

    const papersMap = parseMappingFromText(text);
    const gtLevel = findGradeThresholdOrInsert(text);
    const syllabusEntry: Record<string, string> = {};
    for (const [paper, level] of papersMap) syllabusEntry[String(paper)] = level;
    if (gtLevel) syllabusEntry["null"] = gtLevel; // grade thresholds/inserts

    if (Object.keys(syllabusEntry).length === 0) {
      console.warn(`No explicit paper-level mapping found inside ${e}. Please review this syllabus manually.`);
      continue;
    }

    mapping[syllabusId] = syllabusEntry;
  }
  return mapping;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: npx tsx bin/exam-hub-ingest/generate-qualification-mapping.ts <syllabi-pdf-folder> [--apply]");
    process.exit(1);
  }
  const folder = args[0];
  const apply = args.includes("--apply");

  if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
    console.error(`Folder not found: ${folder}`);
    process.exit(1);
  }

  const mapping = await generateMappingsFromFolder(folder);

  if (Object.keys(mapping).length === 0) {
    console.error("No mappings generated. Ensure the folder contains official Cambridge syllabus PDFs named with the syllabus id (e.g., 9709_syllabus.pdf)");
    process.exit(1);
  }

  console.log("\nGenerated mapping preview:");
  console.log(JSON.stringify(mapping, null, 2));

  const outFile = path.join(__dirname, "generated-qualification-mapping.json");
  fs.writeFileSync(outFile, JSON.stringify(mapping, null, 2), "utf8");
  console.log(`\nWrote preview to ${outFile}`);

  if (!apply) {
    console.log("Run with --apply to insert these mappings into the database (requires SUPABASE env vars) or copy the JSON to bin/exam-hub-ingest/qualification-mapping.ts as needed.");
    return;
  }

  // On --apply, attempt to insert into DB table qualification_mappings.
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY environment variables.");
    process.exit(1);
  }

  // Lazy import supabase client to avoid at top-level
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // Insert each mapping row. qualification_mappings table expected columns:
  // syllabus_id TEXT, paper_number INTEGER (nullable), level TEXT
  const rows: Array<{ syllabus_id: string; paper_number: number | null; level: string }> = [];
  for (const [syllabusId, map] of Object.entries(mapping)) {
    for (const [paperKey, level] of Object.entries(map)) {
      const paper_number = paperKey === "null" ? null : Number(paperKey);
      rows.push({ syllabus_id: syllabusId, paper_number, level });
    }
  }

  console.log(`\nInserting ${rows.length} mapping rows into qualification_mappings table...`);
  // Upsert behaviour: insert or update existing
  const { error } = await supabase.from("qualification_mappings").upsert(rows, { onConflict: ["syllabus_id", "paper_number"] });
  if (error) {
    console.error("Failed to upsert qualification_mappings:", error.message);
    process.exit(1);
  }
  console.log("Done. Mappings inserted into database.");
}

main().catch((err) => {
  console.error("Failed:", (err as Error).message);
  process.exit(1);
});
