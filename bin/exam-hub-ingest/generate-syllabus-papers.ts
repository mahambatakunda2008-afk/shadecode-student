/**
 * bin/exam-hub-ingest/generate-syllabus-papers.ts
 *
 * Generate canonical syllabus_papers mapping from local official Cambridge
 * syllabus PDFs. Conservative parser: only writes entries when it can
 * confidently extract paper number and either level or title.
 *
 * Usage:
 *   npm install pdf-parse
 *   npx tsx bin/exam-hub-ingest/generate-syllabus-papers.ts ./official-syllabi [--apply]
 *
 * With --apply the script will upsert into the DB table `syllabus_papers`.
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
 */

import fs from "fs";
import path from "path";

type SyllabusPaperRow = {
  syllabus_id: string;
  paper_number: number | null;
  level: string | null;
  paper_title: string | null;
  marks: string | null;
  duration: string | null;
  source_document: string | null;
};

async function extractTextFromPdf(filePath: string): Promise<string> {
  const data = fs.readFileSync(filePath);

  // First try pdf-parse if available
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParseModule = require("pdf-parse");
    const pdfParseFn = (pdfParseModule && (pdfParseModule.default || pdfParseModule)) as any;
    if (typeof pdfParseFn === "function") {
      const res = await pdfParseFn(data);
      return res.text as string;
    }
  } catch (e) {
    // ignore and try pdfjs-dist next
  }

  // Fallback: use pdfjs-dist directly (ESM build). Use dynamic import to support ESM.
  try {
  const pdfjsModule = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const uint8 = new Uint8Array(data);
  const loadingTask = pdfjsModule.getDocument({ data: uint8 });
  const pdf = await loadingTask.promise;
  let full = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    // eslint-disable-next-line no-await-in-loop
    const page = await pdf.getPage(i);
    // eslint-disable-next-line no-await-in-loop
    const content = await page.getTextContent();
    const strs = content.items.map((it: any) => (it.str || "")).join(" ");
    full += strs + "\n";
  }
  return full;
  } catch (e) {
  throw new Error("No working PDF text extractor found. Install 'pdf-parse' or ensure 'pdfjs-dist' is available. Original errors: " + ((e as Error).message || e));
  }
}

function findSyllabusIdFromFilename(filename: string): string | null {
  const b = path.basename(filename);
  const m = /^([0-9]{4,})/i.exec(b);
  return m ? m[1] : null;
}

// Reuse conservative parser from previous script to map papers -> level
function parsePaperLevels(text: string): Map<number, string> {
  const map = new Map<number, string>();
  const normalized = text.replace(/\r/g, "\n");
  const candidates = normalized.split(/[\n\.\r]+/).map((s) => s.trim()).filter(Boolean);
  const paperIsRegex = /Paper\s+(\d+)\s+is\s+(AS|A)\s*Level/iu;
  const papersAreRegex = /Papers?\s+([0-9,\sand-]+)\s+are\s+(AS|A)\s*Level/iu;

  for (const s of candidates) {
    let m = paperIsRegex.exec(s);
    if (m) {
      const num = Number(m[1]);
      const level = m[2].toUpperCase() === "AS" ? "AS Level" : "A Level";
      map.set(num, level);
      continue;
    }
    m = papersAreRegex.exec(s);
    if (m) {
      const numsStr = m[1];
      const level = m[2].toUpperCase() === "AS" ? "AS Level" : "A Level";
      const parts = numsStr.split(/[,\s]+/).map((p: string) => p.replace(/and/gi, "").trim()).filter(Boolean);
      for (const part of parts) {
        if (/^[0-9]+$/.test(part)) map.set(Number(part), level);
        else if (/^([0-9]+)-([0-9]+)$/.test(part)) {
          const rm = /^([0-9]+)-([0-9]+)$/.exec(part)!;
          const start = Number(rm[1]);
          const end = Number(rm[2]);
          for (let i = start; i <= end; i++) map.set(i, level);
        }
      }
    }
  }
  return map;
}

function findPaperSections(text: string): Array<{ num: number; title?: string; snippet?: string; index: number }> {
  const results: Array<{ num: number; title?: string; snippet?: string; index: number }> = [];
  // Search for occurrences of "Paper X" and capture following characters
  const regex = /(?:Paper|Component)\s*(\d{1,2})\b([^\n\r]{0,200})/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const num = Number(m[1]);
    const rest = m[2].trim();
    const idx = m.index;
    // Try to extract title from nearby text: take up to next line break after match
    const after = text.slice(idx, idx + 400);
    const lineMatch = /(?:Paper|Component)\s*\d{1,2}[^\n\r]*[\n\r]+([^\n\r]+)/i.exec(after);
    const title = lineMatch ? lineMatch[1].trim() : rest || undefined;
    const snippet = text.slice(Math.max(0, idx - 200), Math.min(text.length, idx + 400));
    results.push({ num, title, snippet, index: idx });
  }
  return results;
}

function findDurationAndMarks(snippet: string): { duration: string | null; marks: string | null } {
  // Look for Duration: X or Time allowed: X or Duration X minutes
  let duration: string | null = null;
  let marks: string | null = null;
  const durationRegexes = [/(Duration|Time allowed)[:\s]*([0-9hmin\s]+)/i, /(Duration)\s*([0-9]+)\s*minutes/i];
  for (const r of durationRegexes) {
    const m = r.exec(snippet);
    if (m) {
      duration = m[2] ? m[2].trim() : m[1].trim();
      break;
    }
  }
  const marksRegex = /(Marks|Maximum mark[s]?)[:\s]*([0-9]+)/i;
  const mm = marksRegex.exec(snippet);
  if (mm) marks = mm[2];
  return { duration, marks };
}

async function generateFromFolder(folder: string): Promise<SyllabusPaperRow[]> {
  const entries = fs.readdirSync(folder);
  const rows: SyllabusPaperRow[] = [];

  for (const e of entries) {
    const full = path.join(folder, e);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(full);
    } catch (err) {
      continue;
    }
    if (!stat.isFile()) continue;
    if (path.extname(full).toLowerCase() !== ".pdf") continue;
    const syllabusId = findSyllabusIdFromFilename(e);
    if (!syllabusId) {
      console.warn(`Skipping ${e}: cannot find syllabus id in filename.`);
      continue;
    }
    console.log(`Processing ${e}...`);
    let text: string;
    try {
      text = await extractTextFromPdf(full);
    } catch (err) {
      console.error(`Failed to extract ${e}: ${(err as Error).message}`);
      continue;
    }

    // Parse explicit paper->level declarations
    const levelMap = parsePaperLevels(text); // Map<number, string>
    // Find paper sections to extract title/duration/marks
    const sections = findPaperSections(text);

    // For each section that exists in levelMap OR has a decent title, create row
    const handled = new Set<number>();
    for (const sec of sections) {
      const num = sec.num;
      const title = sec.title ?? null;
      const { duration, marks } = findDurationAndMarks(sec.snippet ?? "");
      const level = levelMap.get(num) ?? null;
      if (!title && !level) {
        // Skip ambiguous entries
        continue;
      }
      rows.push({
        syllabus_id: syllabusId,
        paper_number: num,
        level,
        paper_title: title,
        marks,
        duration,
        source_document: e,
      });
      handled.add(num);
    }

    // Also include any mappings from levelMap that didn't have a section
    for (const [num, level] of levelMap) {
      if (handled.has(num)) continue;
      rows.push({
        syllabus_id: syllabusId,
        paper_number: num,
        level,
        paper_title: null,
        marks: null,
        duration: null,
        source_document: e,
      });
    }

    // Check for GT/IN (no paper number) mapping
    const gtRegex = /(Grade thresholds|GT|Insert|IN)\b[\s\S]*?(AS|A)\s*Level/iu;
    const gtMatch = gtRegex.exec(text);
    if (gtMatch) {
      const lvl = gtMatch[2].toUpperCase() === "AS" ? "AS Level" : "A Level";
      rows.push({
        syllabus_id: syllabusId,
        paper_number: null,
        level: lvl,
        paper_title: "Grade thresholds / Inserts",
        marks: null,
        duration: null,
        source_document: e,
      });
    }
  }
  return rows;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: npx tsx bin/exam-hub-ingest/generate-syllabus-papers.ts <folder> [--apply]");
    process.exit(1);
  }
  const folder = args[0];
  const apply = args.includes("--apply");

  if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
    console.error(`Folder not found: ${folder}`);
    process.exit(1);
  }

  const rows = await generateFromFolder(folder);
  if (rows.length === 0) {
    console.error("No confident mappings extracted. Inspect PDFs or adjust parser.");
    process.exit(1);
  }

  const outFile = path.join(__dirname, "generated-syllabus-papers.json");
  fs.writeFileSync(outFile, JSON.stringify(rows, null, 2), "utf8");
  console.log(`Wrote ${rows.length} rows to ${outFile}`);

  if (!apply) {
    console.log("Run with --apply to upsert these rows into the DB table 'syllabus_papers' (requires SUPABASE env vars). Review the JSON before applying.");
    return;
  }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY environment variables.");
    process.exit(1);
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // Upsert into syllabus_papers table. Expected columns:
  // syllabus_id TEXT, paper_number INTEGER (nullable), level TEXT, paper_title TEXT, marks TEXT, duration TEXT, source_document TEXT
  const { error } = await supabase.from("syllabus_papers").upsert(rows, { onConflict: ["syllabus_id", "paper_number"] });
  if (error) {
    console.error("Failed to upsert syllabus_papers:", error.message);
    process.exit(1);
  }
  console.log("Inserted/updated syllabus_papers in DB.");
}

main().catch((err) => {
  console.error("Failed:", (err as Error).message);
  process.exit(1);
});
