/**
 * bin/exam-hub-ingest/ingest.ts
 *
 * Bulk-ingest a local folder of past-paper PDFs into Supabase Storage +
 * the past_papers table. Source-agnostic — doesn't care where the PDFs
 * came from, only that you have them locally and named correctly.
 *
 * FILENAME CONVENTION (case-insensitive, underscore-separated):
 *   {syllabus}_{level}_{session}_{year}_p{paperNumber}_v{variant}_{kind}.pdf
 *
 *   syllabus     e.g. 9702                (must exist in the `syllabi` table first)
 *   level        AS | A                   (maps to "AS Level" / "A Level")
 *   session      FebMarch | MayJune | OctNov
 *   year         4-digit year
 *   paperNumber  p<number>                e.g. p2
 *   variant      v<number>                e.g. v2
 *   kind         qp | ms | in | gt
 *
 * Example: 9702_AS_MayJune_2025_p2_v2_qp.pdf
 *          -> Physics (9702), AS Level, May/June 2025, Paper 2/2, Question Paper
 *
 * USAGE:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx bin/exam-hub-ingest/ingest.ts ./path/to/pdf/folder
 *
 * Requires the SERVICE ROLE key (not the anon key) — this bypasses RLS
 * intentionally, since ingestion is an admin-only, server-side operation.
 * Never expose this key to the client or commit it anywhere.
 *
 * Idempotent: re-running with the same files is safe (upserts on the
 * (syllabus, level, session, year, paper_number, variant, kind) unique key).
 */

import { createClient } from "@supabase/supabase-js";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, extname } from "path";

const SESSION_MAP: Record<string, string> = {
  febmarch: "Feb/March",
  mayjune: "May/June",
  octnov: "Oct/Nov",
};

const LEVEL_MAP: Record<string, string> = {
  as: "AS Level",
  a: "A Level",
};

const VALID_KINDS = new Set(["qp", "ms", "in", "gt"]);

const FILENAME_PATTERN =
  /^(\w+)_(as|a)_(febmarch|mayjune|octnov)_(\d{4})_p(\d+)_v(\d+)_(qp|ms|in|gt)\.pdf$/i;

interface ParsedFile {
  filename: string;
  fullPath: string;
  syllabus: string;
  level: string;
  session: string;
  year: number;
  paperNumber: number;
  variant: number;
  kind: string;
}

function parseFilename(filename: string, fullPath: string): ParsedFile | null {
  const match = FILENAME_PATTERN.exec(filename);
  if (!match) return null;

  const [, syllabus, level, session, year, paperNumber, variant, kind] = match;
  const mappedLevel = LEVEL_MAP[level.toLowerCase()];
  const mappedSession = SESSION_MAP[session.toLowerCase()];
  if (!mappedLevel || !mappedSession || !VALID_KINDS.has(kind.toLowerCase())) return null;

  return {
    filename,
    fullPath,
    syllabus: syllabus.toLowerCase(),
    level: mappedLevel,
    session: mappedSession,
    year: Number(year),
    paperNumber: Number(paperNumber),
    variant: Number(variant),
    kind: kind.toLowerCase(),
  };
}

async function main() {
  const folder = process.argv[2];
  if (!folder) {
    console.error("Usage: npx tsx bin/exam-hub-ingest/ingest.ts <folder>");
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY environment variables.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const entries = readdirSync(folder).filter((f) => extname(f).toLowerCase() === ".pdf");
  if (entries.length === 0) {
    console.log("No PDF files found in", folder);
    return;
  }

  const parsed: ParsedFile[] = [];
  const skipped: string[] = [];

  for (const filename of entries) {
    const fullPath = join(folder, filename);
    const result = parseFilename(filename, fullPath);
    if (result) {
      parsed.push(result);
    } else {
      skipped.push(filename);
    }
  }

  if (skipped.length > 0) {
    console.log(`\nSkipped ${skipped.length} file(s) that don't match the naming convention:`);
    skipped.forEach((f) => console.log(`  - ${f}`));
    console.log(
      "\nExpected: {syllabus}_{AS|A}_{FebMarch|MayJune|OctNov}_{year}_p{paperNumber}_v{variant}_{qp|ms|in|gt}.pdf\n"
    );
  }

  // Validate syllabus codes exist before uploading anything.
  const syllabusIds = [...new Set(parsed.map((p) => p.syllabus))];
  const { data: existingSyllabi, error: syllabiError } = await supabase
    .from("syllabi")
    .select("id")
    .in("id", syllabusIds);

  if (syllabiError) {
    console.error("Failed to check syllabi:", syllabiError.message);
    process.exit(1);
  }

  const knownIds = new Set((existingSyllabi ?? []).map((s) => s.id));
  const unknownIds = syllabusIds.filter((id) => !knownIds.has(id));
  if (unknownIds.length > 0) {
    console.error(
      `\nUnknown syllabus code(s): ${unknownIds.join(", ")}. Add them to the syllabi table first.\n`
    );
    process.exit(1);
  }

  let uploaded = 0;
  let failed = 0;

  for (const file of parsed) {
    const storagePath = `${file.syllabus}/${file.level.replace(" ", "-")}/${file.session.replace("/", "-")}/${file.year}/${file.filename}`;
    const fileBuffer = readFileSync(file.fullPath);
    const fileSize = statSync(file.fullPath).size;

    const { error: uploadError } = await supabase.storage
      .from("past-papers")
      .upload(storagePath, fileBuffer, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      console.error(`✗ Upload failed for ${file.filename}:`, uploadError.message);
      failed++;
      continue;
    }

    const { error: dbError } = await supabase.from("past_papers").upsert(
      {
        syllabus_id: file.syllabus,
        level: file.level,
        session: file.session,
        year: file.year,
        paper_number: file.paperNumber,
        variant: file.variant,
        kind: file.kind,
        file_path: storagePath,
        file_size_bytes: fileSize,
      },
      { onConflict: "syllabus_id,level,session,year,paper_number,variant,kind" }
    );

    if (dbError) {
      console.error(`✗ DB upsert failed for ${file.filename}:`, dbError.message);
      failed++;
      continue;
    }

    console.log(`✓ ${file.filename}`);
    uploaded++;
  }

  console.log(`\nDone. ${uploaded} uploaded, ${failed} failed, ${skipped.length} skipped.`);
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
