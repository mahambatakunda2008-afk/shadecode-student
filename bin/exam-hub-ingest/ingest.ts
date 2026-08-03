/**
 * bin/exam-hub-ingest/ingest.ts
 *
 * Upgraded bulk-ingest for Cambridge past papers. Preserves existing Supabase
 * storage + DB upsert behavior while adding:
 *  - Support for short Cambridge filenames (e.g. 9702_w25_qp_52.pdf)
 *  - Season/year/paper decoding, gt/in handling
 *  - Recursive folder scanning
 *  - Dry-run mode (--dry-run)
 *  - Validation report before uploading
 *  - Better parsing error messages
 *  - Parallel uploads with configurable concurrency (--concurrency N)
 *  - Progress output and final summary (uploaded/updated/skipped/failed)
 *
 * Design goals: surgical changes, keep strict TypeScript, small memory footprint.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, extname, basename } from "path";

type Maybe<T> = T | null;

const CAMBRIDGE_SEASON_MAP: Record<string, string> = {
  w: "Oct/Nov",
  s: "May/June",
  m: "Feb/March",
};

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

// Verbose (existing) pattern: 9702_AS_MayJune_2025_p2_v2_qp.pdf
const VERBOSE_PATTERN = /^([\w-]+)_(AS|A)_(FebMarch|MayJune|OctNov)_(\d{4})_p(\d+)_v(\d+)_(qp|ms|in|gt)\.pdf$/i;
// Short Cambridge pattern: 9702_w25_qp_52.pdf OR 9702_w25_gt.pdf
const CAMBRIDGE_SHORT_PATTERN = /^([\w-]+)_([wsm])(\d{2})_([a-z]{2,3})(?:_(\d{2}))?\.pdf$/i;

interface ParsedFile {
  filename: string; // basename with extension
  fullPath: string; // absolute or relative path used to read file
  syllabus: string; // syllabus id, lowercase
  level: Maybe<string>; // mapped level or null if absent
  session: string; // exact string: "Oct/Nov" | "May/June" | "Feb/March"
  year: number; // full 4-digit year
  paperNumber: Maybe<number>;
  variant: Maybe<number>;
  kind: string; // qp|ms|in|gt
}

interface ParseError {
  filename: string;
  fullPath: string;
  reason: string;
  suggestion?: string;
}

function scanPdfsRecursive(folder: string): string[] {
  const results: string[] = [];
  const stack = [folder];
  while (stack.length) {
    const cur = stack.pop() as string;
    const items = readdirSync(cur);
    for (const it of items) {
      const full = join(cur, it);
      try {
        const st = statSync(full);
        if (st.isDirectory()) stack.push(full);
        else if (st.isFile() && extname(full).toLowerCase() === ".pdf") results.push(full);
      } catch (e) {
        console.error(`Warning: failed to stat ${full}:`, (e as Error).message);
      }
    }
  }
  return results;
}

function twoDigitYearToFull(two: string): number {
  const n = Number(two);
  return 2000 + n; // requirement: do not assume before 2000
}

function decodePaperVariant(code: string): { paperNumber: number; variant: number } | null {
  if (!/^[0-9]{2}$/.test(code)) return null;
  const a = Number(code[0]);
  const b = Number(code[1]);
  return { paperNumber: a, variant: b };
}

function parseFilenameFlexible(fullPath: string): ParsedFile | ParseError {
  const filename = basename(fullPath);
  // Try verbose first (backwards compatibility)
  const v = VERBOSE_PATTERN.exec(filename);
  if (v) {
    const [, syllabusRaw, levelRaw, sessionRaw, yearRaw, pNum, pVar, kindRaw] = v;
    const level = LEVEL_MAP[levelRaw.toLowerCase()];
    const session = SESSION_MAP[sessionRaw.toLowerCase()];
    const kind = kindRaw.toLowerCase();
    if (!level || !session || !VALID_KINDS.has(kind)) {
      return {
        filename,
        fullPath,
        reason: `Invalid mapping in verbose filename. level='${levelRaw}', session='${sessionRaw}', kind='${kindRaw}'`,
      };
    }
    return {
      filename,
      fullPath,
      syllabus: syllabusRaw.toLowerCase(),
      level,
      session,
      year: Number(yearRaw),
      paperNumber: Number(pNum),
      variant: Number(pVar),
      kind,
    };
  }

  // Try Cambridge short pattern
  const s = CAMBRIDGE_SHORT_PATTERN.exec(filename);
  if (s) {
    const [, syllabusRaw, seasonLetter, yy, kindRaw, paperVariantCode] = s;
    const kind = kindRaw.toLowerCase();
    if (!VALID_KINDS.has(kind)) {
      return {
        filename,
        fullPath,
        reason: `Unknown paper type "${kindRaw}". Expected one of: ${Array.from(VALID_KINDS).join(", ")}`,
      };
    }
    const session = CAMBRIDGE_SEASON_MAP[seasonLetter.toLowerCase()];
    if (!session) {
      return { filename, fullPath, reason: `Unknown season letter '${seasonLetter}'. Expected w/s/m.` };
    }
    const year = twoDigitYearToFull(yy);
    let paperNumber: Maybe<number> = null;
    let variant: Maybe<number> = null;
    if (paperVariantCode) {
      const dec = decodePaperVariant(paperVariantCode);
      if (!dec) {
        return {
          filename,
          fullPath,
          reason: `Invalid paper/variant code '${paperVariantCode}'. Expected two digits, e.g. 52 -> paper 5, variant 2.`,
        };
      }
      paperNumber = dec.paperNumber;
      variant = dec.variant;
    } else {
      // allowed for gt/in files which often don't include paper/variant
      if (kind !== "gt" && kind !== "in") {
        return {
          filename,
          fullPath,
          reason: `Missing paper/variant code for kind '${kind}'. Expected e.g. '_52' suffix for qp/ms.`,
        };
      }
    }

    return {
      filename,
      fullPath,
      syllabus: syllabusRaw.toLowerCase(),
      level: null, // short Cambridge names don't include AS/A level
      session,
      year,
      paperNumber,
      variant,
      kind,
    };
  }

  // Not matched — provide helpful suggestions
  return {
    filename,
    fullPath,
    reason:
      "Filename invalid. Expected either verbose: {syllabus}_{AS|A}_{FebMarch|MayJune|OctNov}_{YYYY}_p{n}_v{n}_{qp|ms|in|gt}.pdf\n" +
      "Or Cambridge short: {syllabus}_{w|s|m}{YY}_{qp|ms|gt|in}_{paperVariant?}.pdf (e.g. 9702_w25_qp_52.pdf or 9702_w25_gt.pdf)",
  };
}

function storagePathFor(file: ParsedFile): string {
  if (!file.level) throw new Error(`Missing qualification level for ${file.filename} when building storage path`);
  const levelSegment = file.level.replace(/\s+/g, "-");
  const sessionSegment = file.session.replace("/", "-");
  return `${file.syllabus}/${levelSegment}/${sessionSegment}/${file.year}/${file.filename}`;
}

async function checkSyllabiExist(supabase: any, syllabi: string[]): Promise<{ unknown: string[]; error?: Error }> {
  if (syllabi.length === 0) return { unknown: [] };
  const { data, error } = await supabase.from("syllabi").select("id").in("id", syllabi);
  if (error) return { unknown: [], error };
  const known = new Set((data ?? []).map((r: any) => String(r.id)));
  const unknown = syllabi.filter((s) => !known.has(s));
  return { unknown };
}

// Resolve qualification + paper metadata from canonical syllabus_papers table.
// Returns detailed info or null if no mapping exists. No guessing or fallback.
async function resolveQualificationLevel(
  supabase: any,
  syllabusId: string,
  paperNumber: Maybe<number>
): Promise<{
  level: string;
  paper_title: string | null;
  marks: string | null;
  duration: string | null;
  source_document: string | null;
  source: "syllabus_papers";
} | null> {
  if (!supabase) return null;
  try {
    let q: any = supabase
      .from("syllabus_papers")
      .select("level,paper_title,marks,duration,source_document")
      .eq("syllabus_id", syllabusId)
      .limit(1);
    if (paperNumber === null) q = q.is("paper_number", null); else q = q.eq("paper_number", paperNumber);
    const { data, error } = await q;
    if (error) throw error;
    if (data && (data as any[]).length > 0) {
      const row = (data as any[])[0];
      return {
        level: row.level,
        paper_title: row.paper_title ?? null,
        marks: row.marks ?? null,
        duration: row.duration ?? null,
        source_document: row.source_document ?? null,
        source: "syllabus_papers",
      };
    }
    return null;
  } catch (e) {
    const msg = (e as Error).message || '';
    // If the DB table doesn't exist in this environment, try a local generated JSON fallback
    if (msg.includes("Could not find the table") || msg.includes("does not exist")) {
      try {
        const genPath = join(process.cwd(), "bin", "exam-hub-ingest", "generated-syllabus-papers.json");
        // require fs locally to avoid missing binding in this module scope
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fsmod = require('fs');
        if (fsmod && fsmod.existsSync(genPath)) {
          const raw = fsmod.readFileSync(genPath, "utf8");
          const rows = JSON.parse(raw) as any[];
          const candidates = rows.filter((r) => String(r.syllabus_id) === String(syllabusId));
          for (const r of candidates) {
            const rn = r.paper_number == null ? null : Number(r.paper_number);
            if ((paperNumber == null && rn == null) || (paperNumber != null && rn === paperNumber)) {
              return {
                level: r.level,
                paper_title: r.paper_title ?? null,
                marks: r.marks ?? null,
                duration: r.duration ?? null,
                source_document: r.source_document ?? null,
                source: "syllabus_papers",
              };
            }
          }
          return null;
        }
      } catch (inner) {
        // fall-through to throw original
      }
    }
    throw new Error(`Failed to query syllabus_papers table: ${(e as Error).message}`);
  }
}

// Build a query to find an existing past_papers row matching the unique key.
function buildExistenceQuery(supabase: any, file: ParsedFile) {
  let q: any = supabase.from("past_papers").select("id,file_size_bytes,file_path");
  q = q.eq("syllabus_id", file.syllabus);
  if (file.level === null) q = q.is("level", null); else q = q.eq("level", file.level);
  q = q.eq("session", file.session).eq("year", file.year);
  if (file.paperNumber === null) q = q.is("paper_number", null); else q = q.eq("paper_number", file.paperNumber);
  if (file.variant === null) q = q.is("variant", null); else q = q.eq("variant", file.variant);
  q = q.eq("kind", file.kind);
  return q;
}

class Semaphore {
  private tasks: Array<() => void> = [];
  private counter: number;
  constructor(private max: number) {
    this.counter = max;
  }
  public async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const tryAcquire = () => {
        if (this.counter > 0) {
          this.counter -= 1;
          resolve(() => {
            this.counter += 1;
            const t = this.tasks.shift();
            if (t) t();
          });
        } else {
          this.tasks.push(tryAcquire);
        }
      };
      tryAcquire();
    });
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: npx tsx bin/exam-hub-ingest/ingest.ts <folder> [--dry-run] [--concurrency N]");
    process.exit(1);
  }
  const folder = args[0];
  const dryRun = args.includes("--dry-run");
  let concurrency = 5;
  const cIndex = args.indexOf("--concurrency");
  if (cIndex >= 0 && args[cIndex + 1]) {
    const n = Number(args[cIndex + 1]);
    if (Number.isInteger(n) && n > 0) concurrency = n;
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

  console.log(`Scanning '${folder}' recursively for PDFs...`);
  const files = scanPdfsRecursive(folder);
  console.log(`Found ${files.length} PDFs.`);

  const parsed: ParsedFile[] = [];
  const errors: ParseError[] = [];

  for (const fp of files) {
    const res = parseFilenameFlexible(fp);
    if ("reason" in res) errors.push(res as ParseError);
    else parsed.push(res as ParsedFile);
  }

  // Detect duplicate basenames (same filename in multiple folders)
  const nameCounts = new Map<string, number>();
  for (const p of [...parsed, ...errors.map((e) => ({ filename: e.filename }))]) {
    nameCounts.set(p.filename, (nameCounts.get(p.filename) ?? 0) + 1);
  }
  const duplicateNames = Array.from(nameCounts.entries()).filter(([, c]) => c > 1).map(([n]) => n);

  // Detect duplicate unique keys among parsed (could indicate multiple files mapping to same DB row)
  const keyMap = new Map<string, ParsedFile[]>();
  function uniqueKeyFor(p: ParsedFile) {
    return `${p.syllabus}|${p.level ?? "<null>"}|${p.session}|${p.year}|${p.paperNumber ?? "<null>"}|${p.variant ?? "<null>"}|${p.kind}`;
  }
  for (const p of parsed) {
    const k = uniqueKeyFor(p);
    (keyMap.get(k) ?? keyMap.set(k, []).get(k))!.push(p);
  }
  const duplicateKeys = Array.from(keyMap.entries()).filter(([, arr]) => arr.length > 1).map(([k, arr]) => ({ key: k, files: arr.map((f) => f.filename) }));

  // Prepare validation: fetch syllabi records (including any level info) and build lookup map
  const total = files.length;
  const validCount = parsed.length;
  const invalidCount = errors.length;
  const syllabusIds = Array.from(new Set(parsed.map((p) => p.syllabus)));

  // Fetch syllabi with possible 'level' column. If the column doesn't exist, fall back to selecting id only.
  let syllabusLevelMap = new Map<string, string>();
  let knownSyllabusIds = new Set<string>();
  if (supabase) {
    try {
      // Try to read level if present
      const { data, error } = await supabase.from("syllabi").select("id, level").in("id", syllabusIds);
      if (!error) {
        for (const row of data ?? []) {
          const id = String(row.id);
          knownSyllabusIds.add(id);
          if (row.level) syllabusLevelMap.set(id, String(row.level));
        }
      } else {
        // If the error indicates the 'level' column is missing, fall back to selecting id only
        const msg = (error as Error).message || '';
        if (msg.includes('column') && msg.includes('level')) {
          console.warn("syllabi.level column not found; falling back to id-only fetch and using syllabus_papers for level resolution.");
          const { data: idsOnly, error: idErr } = await supabase.from("syllabi").select("id").in("id", syllabusIds);
          if (idErr) throw idErr;
          for (const row of idsOnly ?? []) {
            knownSyllabusIds.add(String(row.id));
          }
        } else {
          throw error;
        }
      }
    } catch (e) {
      console.error("Failed to fetch syllabi:", (e as Error).message);
      process.exit(1);
    }
  }

  const unknownSyllabi = syllabusIds.filter((id) => !knownSyllabusIds.has(id));

  // Enrich parsed files with level using canonical syllabus_papers table. No guessing.
  const unresolved: ParsedFile[] = [];
  const resolutionInfo: Record<string, { source: string; paper_title?: string | null; marks?: string | null; duration?: string | null; source_document?: string | null }> = {};
  for (const p of parsed) {
    if (p.level) {
      // level already present from verbose filename — respect it
      resolutionInfo[p.filename] = { source: "filename" };
      continue;
    }
    try {
      const res = await resolveQualificationLevel(supabase, p.syllabus, p.paperNumber);
      if (res && res.level) {
        p.level = res.level;
        resolutionInfo[p.filename] = {
          source: res.source,
          paper_title: res.paper_title,
          marks: res.marks,
          duration: res.duration,
          source_document: res.source_document,
        };
        continue;
      }
    } catch (e) {
      console.error(`Error resolving qualification level for ${p.filename}:`, (e as Error).message);
      process.exit(1);
    }
    unresolved.push(p);
  }

  // Determine missing metadata critical: for qp/ms kinds, paperNumber or variant missing is critical
  const missingMetadata = parsed.filter((p) => (p.kind === "qp" || p.kind === "ms") && (p.paperNumber === null || p.variant === null));

  // Print report
  console.log("\nValidation report:");
  console.log(`  Total PDFs found: ${total}`);
  console.log(`  Valid parsed: ${validCount}`);
  console.log(`  Invalid filenames: ${invalidCount}`);
  if (invalidCount > 0) console.log(`    Examples: ${errors.slice(0, 10).map((e) => `\n      ${e.filename} -> ${e.reason}`).join("")}`);
  console.log(`  Duplicate basenames: ${duplicateNames.length}`);
  if (duplicateNames.length > 0) console.log(`    ${duplicateNames.slice(0, 10).join(", ")}`);
  console.log(`  Duplicate target keys: ${duplicateKeys.length}`);
  if (duplicateKeys.length > 0) console.log(`    ${duplicateKeys.slice(0, 10).map((d) => `\n      ${d.key} -> ${d.files.join(", ")}`).join("")}`);
  console.log(`  Unknown syllabus IDs: ${unknownSyllabi.length}`);
  if (unknownSyllabi.length > 0) console.log(`    ${unknownSyllabi.join(", ")}`);
  console.log(`  Missing critical metadata (qp/ms without paper/variant): ${missingMetadata.length}`);
  if (missingMetadata.length > 0) console.log(`    ${missingMetadata.slice(0, 10).map((p) => p.filename).join(", ")}`);
  console.log(`  Unresolved qualification levels: ${unresolved.length}`);
  if (unresolved.length > 0) console.log(`    ${unresolved.slice(0, 10).map((p) => `\n      ${p.filename} -> Syllabus: ${p.syllabus}, Paper: ${p.paperNumber ?? "(none)"}`).join("")}`);

  // Decide abort conditions for structural/metadata issues (excluding unresolved mapping which is handled separately)
  const structuralErrors = unknownSyllabi.length > 0 || duplicateKeys.length > 0 || missingMetadata.length > 0;
  if (structuralErrors) {
    console.error("\nCritical issues detected — aborting ingestion. Fix the issues and retry.");
    process.exit(1);
  }

  // Any unresolved qualification level mappings are fatal and must be reported clearly.
  if (unresolved.length > 0) {
    for (const u of unresolved) {
      console.error("\nCannot determine qualification level.\n");
      console.error(`Syllabus: ${u.syllabus}`);
      console.error(`Paper: ${u.paperNumber ?? "(none)"}\n`);
      console.error("No mapping exists.\n");
      console.error("Please add a mapping to the 'syllabus_papers' DB table or generate mappings from official syllabus PDFs using bin/exam-hub-ingest/generate-syllabus-papers.ts and retry. Aborting.\n");
    }
    process.exit(1);
  }

  function prettySource(s: string | undefined) {
    switch (s) {
      case "filename":
        return "Filename";
      case "syllabus_papers":
        return "Official syllabus mapping (syllabus_papers)";
      default:
        return "(unknown)";
    }
  }

  if (dryRun) {
    console.log("\nDry-run: detailed detected metadata for first 50 files:");
    for (const p of parsed.slice(0, 50)) {
      const info = resolutionInfo[p.filename];
      console.log(
        `\n${p.filename}\n  Syllabus: ${p.syllabus}\n  Paper: ${p.paperNumber ?? "(none)"}\n  Variant: ${p.variant ?? "(none)"}\n  Session: ${p.session}\n  Year: ${p.year}\n  Kind: ${p.kind}\n  Resolved Level: ${p.level}\n  Paper title: ${info?.paper_title ?? "(none)"}\n  Marks: ${info?.marks ?? "(none)"}\n  Duration: ${info?.duration ?? "(none)"}\n  Source: ${prettySource(info?.source)}${info?.source_document ? `\n  Source document: ${info?.source_document}` : ""}`
      );
    }
    console.log(`\nDry-run complete. ${validCount} valid, ${invalidCount} invalid.`);
    return;
  }

  console.log(`\nBeginning upload with concurrency=${concurrency}...`);
  const sem = new Semaphore(concurrency);
  let uploaded = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const totalToProcess = parsed.length;
  let processed = 0;

  const tasks = parsed.map((p) => async () => {
    const release = await sem.acquire();
    try {
      processed++;
      console.log(`\n[${processed} / ${totalToProcess}]\nUploading:\n  ${p.filename}`);
      // check existing row
      const q = buildExistenceQuery(supabase, p);
      const { data: existingRows, error: existErr } = await q;
      if (existErr) {
        console.error(`✗ DB lookup failed for ${p.filename}:`, existErr.message);
        failed++;
        return;
      }
      const existing = (existingRows ?? [])[0] ?? null;
      const fileSize = statSync(p.fullPath).size;
      const storagePath = storagePathFor(p);
      if (existing) {
        // If identical file exists (same path and size) -> skip
        if (existing.file_path === storagePath && existing.file_size_bytes === fileSize) {
          console.log(`→ Skipping (already exists and identical): ${p.filename}`);
          skipped++;
          return;
        }
      }

      // Upload file (upsert true to override existing object)
      const buffer = readFileSync(p.fullPath);
      const { error: uploadError } = await supabase.storage
        .from("past-papers")
        .upload(storagePath, buffer, { contentType: "application/pdf", upsert: true });
      if (uploadError) {
        console.error(`✗ Upload failed for ${p.filename}:`, uploadError.message);
        failed++;
        return;
      }

      // Upsert DB row. Use same unique-on-conflict as before.
      const upsertRow: any = {
        syllabus_id: p.syllabus,
        level: p.level,
        session: p.session,
        year: p.year,
        paper_number: p.paperNumber,
        variant: p.variant,
        kind: p.kind,
        file_path: storagePath,
        file_size_bytes: fileSize,
      };
      const { error: dbError } = await supabase
        .from("past_papers")
        .upsert(upsertRow, { onConflict: "syllabus_id,level,session,year,paper_number,variant,kind" });
      if (dbError) {
        console.error(`✗ DB upsert failed for ${p.filename}:`, dbError.message);
        failed++;
        return;
      }

      if (existing) updated++; else uploaded++;
    } catch (err) {
      console.error(`✗ Error processing ${p.filename}:`, (err as Error).message);
      failed++;
    } finally {
      release();
    }
  });

  // Run tasks in parallel but controlled by semaphore
  await Promise.all(tasks.map((t) => t()));

  // Final summary
  console.log(`\nSummary:`);
  console.log(`  Uploaded (new): ${uploaded}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed: ${failed}`);
}

main().catch((err) => {
  console.error("Ingestion failed:", (err as Error).message);
  process.exit(1);
});