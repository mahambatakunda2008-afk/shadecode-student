export interface ExtractedQuestion {
  questionNumber: string;
  questionText: string;
  marks: number | null;
}

const TOP_LEVEL_QUESTION = /^\s*(\d{1,3})[.)]?\s+(\S.*)$/;
const MARKS_AT_END = /\[\s*(\d{1,3})\s*\]\s*$/;

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
 * Conservative parser for question-paper text. It only recognizes numbered
 * top-level questions and never invents topic, difficulty, or marks metadata.
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
    const markMatch = MARKS_AT_END.exec(raw);
    const marks = markMatch ? Number(markMatch[1]) : null;
    const questionText = markMatch ? raw.slice(0, markMatch.index).trim() : raw;
    if (questionText.length < 3) return;
    questions.push({ questionNumber: currentNumber, questionText, marks });
  };

  for (const line of lines) {
    const match = TOP_LEVEL_QUESTION.exec(line);
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
