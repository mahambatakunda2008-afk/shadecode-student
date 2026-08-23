export interface ExtractedQuestion {
  questionNumber: string;
  questionText: string;
  marks: number | null;
  sourcePageStart: number | null;
  sourcePageEnd: number | null;
  extractionMethod: 'explicit-numbering' | 'plain-numbering';
  extractionConfidence: number;
}

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

const EXPLICIT_TOP_LEVEL = /^\s*(\d{1,2})[.)]\s+(.+)$/;
const PLAIN_TOP_LEVEL = /^\s*(\d{1,2})\s+((?!\([a-z]\)|[a-z]\))\S.*)$/i;
const MARKS_PATTERN = /\[\s*(\d{1,3})\s*\]/;

function normalizeLine(line: string): string {
  return line.replace(/[ \t]+/g, ' ').trim();
}

function cleanBlock(lines: string[]): string {
  return lines
    .map(normalizeLine)
    .filter(Boolean)
    .join(' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

function parseQuestion(
  currentNumber: string,
  currentLines: string[],
  sourcePageStart: number,
  sourcePageEnd: number,
  extractionMethod: ExtractedQuestion['extractionMethod'],
): ExtractedQuestion | null {
  const raw = cleanBlock(currentLines);
  if (!raw) return null;

  const markMatch = MARKS_PATTERN.exec(raw);
  const marks = markMatch ? Number(markMatch[1]) : null;
  const questionText = markMatch
    ? (raw.slice(0, markMatch.index) + raw.slice(markMatch.index + markMatch[0].length))
        .replace(/\s+/g, ' ')
        .trim()
    : raw;

  if (questionText.length < 3) return null;

  // This is extraction confidence, not correctness or topic confidence.
  // Explicit punctuation is stronger evidence of a top-level boundary than
  // the more ambiguous plain-number format.
  const confidence = extractionMethod === 'explicit-numbering' ? 0.98 : 0.9;

  return {
    questionNumber: currentNumber,
    questionText,
    marks,
    sourcePageStart,
    sourcePageEnd,
    extractionMethod,
    extractionConfidence: confidence,
  };
}

/**
 * Conservative parser for question-paper text with page provenance.
 * It recognizes explicit numbered top-level questions and plain numbered
 * questions while rejecting common subparts such as "2 (a)" and "3 b)".
 */
export function extractTopLevelQuestionsFromPages(pages: ExtractedPage[]): ExtractedQuestion[] {
  const questions: ExtractedQuestion[] = [];
  let currentNumber: string | null = null;
  let currentLines: string[] = [];
  let sourcePageStart = 0;
  let sourcePageEnd = 0;
  let extractionMethod: ExtractedQuestion['extractionMethod'] = 'plain-numbering';

  const flush = () => {
    if (!currentNumber) return;
    const question = parseQuestion(
      currentNumber,
      currentLines,
      sourcePageStart,
      sourcePageEnd,
      extractionMethod,
    );
    if (question) questions.push(question);
  };

  for (const page of pages) {
    const normalized = page.text.replace(/\r\n?/g, '\n').replace(/\f/g, '\n');
    for (const line of normalized.split('\n')) {
      const explicit = EXPLICIT_TOP_LEVEL.exec(line);
      const plain = explicit ? null : PLAIN_TOP_LEVEL.exec(line);
      const match = explicit ?? plain;
      if (match) {
        flush();
        currentNumber = match[1];
        currentLines = [match[2]];
        sourcePageStart = page.pageNumber;
        sourcePageEnd = page.pageNumber;
        extractionMethod = explicit ? 'explicit-numbering' : 'plain-numbering';
      } else if (currentNumber) {
        currentLines.push(line);
        sourcePageEnd = page.pageNumber;
      }
    }
  }
  flush();

  return questions.filter((question, index, all) => {
    const previous = all[index - 1];
    return !previous || previous.questionNumber !== question.questionNumber;
  });
}

/**
 * Backwards-compatible text-only extractor for callers that do not have page
 * information. New ingestion should prefer extractTopLevelQuestionsFromPages.
 */
export function extractTopLevelQuestions(text: string): ExtractedQuestion[] {
  return extractTopLevelQuestionsFromPages([{ pageNumber: 1, text }]);
}

export function normalizeExtractedQuestionText(text: string): string {
  return cleanBlock(text.split('\n'));
}
