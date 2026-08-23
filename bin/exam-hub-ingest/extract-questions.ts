/**
 * Extract numbered questions from legitimate question-paper PDFs.
 *
 * Default mode is dry-run and prints a JSON report. Nothing is written to
 * Supabase unless --apply is supplied. Topic and difficulty remain unset:
 * extraction evidence must not be confused with semantic classification.
 * Existing question rows are never overwritten.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { extractTopLevelQuestionsFromPages, type ExtractedPage } from '../../src/lib/exam/question-extraction';

type Metadata = {
  syllabusId: string;
  level: string | null;
  session: string;
  year: number;
  paperNumber: number | null;
  variant: number | null;
  kind: string;
};

type Report = {
  file: string;
  status: 'ready' | 'skipped' | 'error';
  paperId?: string;
  questions?: ReturnType<typeof extractTopLevelQuestionsFromPages>;
  reason?: string;
};

const VERBOSE = /^(\w[\w-]*)_(AS|A)_(FebMarch|MayJune|OctNov)_(\d{4})_p(\d+)_v(\d+)_(qp|ms|in|gt)\.pdf$/i;
const SHORT = /^(\w[\w-]*)_([wsm])(\d{2})_([a-z]{2,3})(?:_(\d{2}))?\.pdf$/i;
const SESSIONS: Record<string, string> = { w: 'Oct/Nov', s: 'May/June', m: 'Feb/March', febmarch: 'Feb/March', mayjune: 'May/June', octnov: 'Oct/Nov' };
const LEVELS: Record<string, string> = { as: 'AS Level', a: 'A Level' };

function parseMetadata(filePath: string): Metadata | null {
  const filename = path.basename(filePath);
  const verbose = VERBOSE.exec(filename);
  if (verbose) {
    const [, syllabusId, level, session, year, paperNumber, variant, kind] = verbose;
    return { syllabusId: syllabusId.toLowerCase(), level: LEVELS[level.toLowerCase()] ?? null, session: SESSIONS[session.toLowerCase()], year: Number(year), paperNumber: Number(paperNumber), variant: Number(variant), kind: kind.toLowerCase() };
  }
  const short = SHORT.exec(filename);
  if (!short) return null;
  const [, syllabusId, season, yy, kind, code] = short;
  if (kind.toLowerCase() !== 'qp' || !code) return null;
  return { syllabusId: syllabusId.toLowerCase(), level: null, session: SESSIONS[season.toLowerCase()], year: 2000 + Number(yy), paperNumber: Number(code[0]), variant: Number(code[1]), kind: 'qp' };
}

async function extractPdfPages(filePath: string): Promise<ExtractedPage[]> {
  const data = fs.readFileSync(filePath);
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data) });
  const pdf = await loadingTask.promise;
  const pages: ExtractedPage[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push({
      pageNumber,
      text: content.items.map((item) => ('str' in item ? item.str ?? '' : '')).join(' '),
    });
  }
  return pages;
}

function scan(folder: string): string[] {
  const result: string[] = [];
  const stack = [folder];
  while (stack.length) {
    const current = stack.pop()!;
    for (const name of fs.readdirSync(current)) {
      const full = path.join(current, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) stack.push(full);
      else if (stat.isFile() && path.extname(full).toLowerCase() === '.pdf') result.push(full);
    }
  }
  return result.sort();
}

function sourceTextHash(questionText: string): string {
  return createHash('sha256').update(questionText.trim()).digest('hex');
}

async function main() {
  const args = process.argv.slice(2);
  const folder = args.find((arg) => !arg.startsWith('--'));
  if (!folder) throw new Error('Usage: npx tsx bin/exam-hub-ingest/extract-questions.ts <folder> [--apply]');
  const apply = args.includes('--apply');
  const maxQuestionsArg = args.indexOf('--max-questions');
  const maxQuestions = maxQuestionsArg >= 0 ? Number(args[maxQuestionsArg + 1]) : 100;
  if (!Number.isInteger(maxQuestions) || maxQuestions < 1 || maxQuestions > 500) throw new Error('--max-questions must be an integer from 1 to 500');

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const reports: Report[] = [];
  for (const file of scan(folder)) {
    const metadata = parseMetadata(file);
    if (!metadata) { reports.push({ file, status: 'skipped', reason: 'Not a supported qp filename.' }); continue; }

    let query = supabase.from('past_papers').select('id,level').eq('syllabus_id', metadata.syllabusId).eq('session', metadata.session).eq('year', metadata.year).eq('paper_number', metadata.paperNumber).eq('variant', metadata.variant).eq('kind', 'qp');
    if (metadata.level) query = query.eq('level', metadata.level);
    const { data: papers, error } = await query;
    if (error) throw new Error(`${path.basename(file)}: ${error.message}`);
    if (!papers || papers.length !== 1) { reports.push({ file, status: 'error', reason: `Expected exactly one matching past_papers row; found ${papers?.length ?? 0}.` }); continue; }

    let pages: ExtractedPage[];
    try { pages = await extractPdfPages(file); }
    catch (error) { reports.push({ file, status: 'error', paperId: papers[0].id, reason: `PDF text extraction failed: ${error instanceof Error ? error.message : String(error)}` }); continue; }

    const questions = extractTopLevelQuestionsFromPages(pages);
    if (questions.length === 0) { reports.push({ file, status: 'error', paperId: papers[0].id, reason: 'No numbered top-level questions were extracted.' }); continue; }
    if (questions.length > maxQuestions) { reports.push({ file, status: 'error', paperId: papers[0].id, reason: `Extracted ${questions.length} questions, exceeding safety limit ${maxQuestions}.` }); continue; }

    if (apply) {
      const paperId = papers[0].id;
      const questionNumbers = questions.map((question) => question.questionNumber);
      const { data: existing, error: existingError } = await supabase.from('exam_questions').select('question_number,source_text_hash').eq('paper_id', paperId).in('question_number', questionNumbers);
      if (existingError) { reports.push({ file, status: 'error', paperId, reason: existingError.message }); continue; }
      const existingNumbers = new Set((existing ?? []).map((row) => row.question_number));
      const rows = questions.filter((question) => !existingNumbers.has(question.questionNumber)).map((question) => ({
        paper_id: paperId,
        question_number: question.questionNumber,
        page_number: question.sourcePageStart,
        marks: question.marks,
        question_text: question.questionText,
        source_page_start: question.sourcePageStart,
        source_page_end: question.sourcePageEnd,
        extraction_method: question.extractionMethod,
        extraction_confidence: question.extractionConfidence,
        source_text_hash: sourceTextHash(question.questionText),
        extracted_at: new Date().toISOString(),
      }));
      if (rows.length > 0) {
        const { error: insertError } = await supabase.from('exam_questions').insert(rows);
        if (insertError) { reports.push({ file, status: 'error', paperId, reason: insertError.message }); continue; }
      }
    }

    reports.push({ file, status: 'ready', paperId: papers[0].id, questions });
  }

  const summary = { apply, files: reports.length, ready: reports.filter((report) => report.status === 'ready').length, skipped: reports.filter((report) => report.status === 'skipped').length, errors: reports.filter((report) => report.status === 'error').length, questions: reports.reduce((sum, report) => sum + (report.questions?.length ?? 0), 0) };
  console.log(JSON.stringify({ summary, reports }, null, 2));
  if (summary.errors > 0) process.exitCode = 2;
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
