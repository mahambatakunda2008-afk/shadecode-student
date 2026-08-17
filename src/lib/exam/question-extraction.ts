export interface ExtractedQuestion {
  questionNumber: string;
  questionText: string;
  marks: number | null;
}

const EXPLICIT_TOP_LEVEL = /^\s*(\d{1,2})[.)]\s+(.+)$/;
const PLAIN_TOP_LEVEL = /^\s*(\d{1,2})\s+((?!\([a-z]\)|[a-z]\))\S.*)$/i;
const MARKS_TOKEN = /\[\s*(\d{1,3})\s*\]/;

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

/**
 * Conservative parser for question-paper text. It recognizes explicit
 * numbered top-level questions and plain numbered questions while rejecting
 * common subparts such as "2 (a)" and "3 b)" as new top-level questions.
 * Subparts that belong to a question remain part of that question's text.
 */
export function extractTopLevelQuestions(text: string): ExtractedQuestion[] {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/\f/g, '\n');
  const lines = normalized.split('\n');
  const questions: ExtractedQuestion[] = [];
  let currentNumber: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    if (!currentNumber) return;
    const raw = cleanBlock(currentLines);
    if (!raw) return;

    const markMatch = MARKS_TOKEN.exec(raw);
    const marks = markMatch ? Number(markMatch[1]) : null;
    const questionText = markMatch
      ? `${raw.slice(0, markMatch.index)}${raw.slice(markMatch.index + markMatch[0].length)}`.replace(/\s{2,}/g, ' ').trim()
      : raw;

    if (questionText.length < 3) return;
    questions.push({ questionNumber: currentNumber, questionText, marks });
  };

  for (const line of lines) {
    const match = EXPLICIT_TOP_LEVEL.exec(line) ?? PLAIN_TOP_LEVEL.exec(line);
    if (match) {
      flush();
      currentNumber = match[1];
      currentLines = [match[2]];
    } else if (currentNumber) {
      currentLines.push(line);
    }
  }
  flush();

  return questions.filter((question, index, all) => {
    const previous = all[index - 1];
    return !previous || previous.questionNumber !== question.questionNumber;
  });
}

export function normalizeExtractedQuestionText(text: string): string {
  return cleanBlock(text.split('\n'));
}
