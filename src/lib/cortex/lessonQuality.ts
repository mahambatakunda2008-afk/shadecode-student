export interface LessonQualityBlock {
  type?: string;
  title?: string;
  content?: string;
}

export type LessonQualityIssue =
  | "too-short"
  | "too-few-blocks"
  | "missing-objective"
  | "missing-concept"
  | "missing-worked-example"
  | "missing-checkpoint"
  | "missing-exam-application"
  | "missing-misconception"
  | "missing-summary"
  | "missing-practice"
  | "missing-step-by-step"
  | "missing-specificity"
  | "weak-worked-example"
  | "weak-checkpoint"
  | "weak-practice"
  | "repetition";

export interface LessonQualityResult {
  passed: boolean;
  score: number;
  contentLength: number;
  blockCount: number;
  typeCount: number;
  signalCount: number;
  issues: LessonQualityIssue[];
}

const REQUIRED_TYPES = ["objective", "concept", "example", "checkpoint", "exam", "mistake", "summary", "practice"];
const QUALITY_SIGNALS = ["example", "check", "practice", "mistake", "trap", "summary", "exam", "step"];
const SPECIFICITY_SIGNALS = [
  "because",
  "therefore",
  "for example",
  "calculate",
  "equation",
  "formula",
  "unit",
  "symbol",
  "condition",
  "misconception",
  "answer",
  "given",
  "hence",
  "substitute",
  "derive",
];
const MIN_CONTENT = 1200;
const MIN_BLOCKS = 9;

function normalise(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function words(value: string) {
  return new Set(normalise(value).replace(/[^a-z0-9 ]/g, " ").split(" ").filter((word) => word.length >= 4));
}

function similarity(left: string, right: string) {
  const a = words(left);
  const b = words(right);
  if (!a.size || !b.size) return 0;
  let shared = 0;
  a.forEach((word) => {
    if (b.has(word)) shared += 1;
  });
  return shared / (a.size + b.size - shared);
}

function duplicateRatio(blocks: LessonQualityBlock[]) {
  const nonEmpty = blocks
    .map((block) => normalise(`${block.title ?? ""} ${block.content ?? ""}`))
    .filter((text) => text.length >= 40);
  if (nonEmpty.length < 4) return 0;

  let duplicates = 0;
  let comparisons = 0;
  for (let i = 0; i < nonEmpty.length; i += 1) {
    for (let j = i + 1; j < nonEmpty.length; j += 1) {
      comparisons += 1;
      const left = nonEmpty[i];
      const right = nonEmpty[j];
      if (left === right || similarity(left, right) >= 0.82) duplicates += 1;
    }
  }
  return comparisons ? duplicates / comparisons : 0;
}

function hasType(blocks: LessonQualityBlock[], type: string) {
  return blocks.some((block) => normalise(block.type ?? "") === type);
}

function blockText(blocks: LessonQualityBlock[], type: string) {
  return blocks
    .filter((block) => normalise(block.type ?? "") === type)
    .map((block) => `${block.title ?? ""} ${block.content ?? ""}`)
    .join(" ");
}

function questionCount(text: string) {
  const explicit = (text.match(/\?/g) ?? []).length;
  const numbered = (text.match(/(?:^|\n)\s*(?:question\s*)?\d+[.)]/gi) ?? []).length;
  return Math.max(explicit, numbered);
}

export function assessLessonQuality(blocks: LessonQualityBlock[]): LessonQualityResult {
  const content = blocks.map((block) => `${block.title ?? ""}\n${block.content ?? ""}`).join("\n").trim();
  const lower = normalise(content);
  const typeCount = REQUIRED_TYPES.filter((type) => hasType(blocks, type)).length;
  const signalCount = QUALITY_SIGNALS.filter((signal) => lower.includes(signal)).length;
  const specificityCount = SPECIFICITY_SIGNALS.filter((signal) => lower.includes(signal)).length;
  const contentLength = content.length;
  const blockCount = blocks.length;
  const issues: LessonQualityIssue[] = [];

  if (contentLength < MIN_CONTENT) issues.push("too-short");
  if (blockCount < MIN_BLOCKS) issues.push("too-few-blocks");
  if (!hasType(blocks, "objective")) issues.push("missing-objective");
  if (!hasType(blocks, "concept")) issues.push("missing-concept");
  if (!hasType(blocks, "example")) issues.push("missing-worked-example");
  if (!hasType(blocks, "checkpoint")) issues.push("missing-checkpoint");
  if (!hasType(blocks, "exam")) issues.push("missing-exam-application");
  if (!hasType(blocks, "misconception")) issues.push("missing-misconception");
  if (!hasType(blocks, "summary")) issues.push("missing-summary");
  if (!hasType(blocks, "practice")) issues.push("missing-practice");

  const exampleText = blockText(blocks, "example");
  const checkpointText = blockText(blocks, "checkpoint");
  const practiceText = blockText(blocks, "practice");
  const examText = blockText(blocks, "exam");
  const hasSteps = /\b(?:step\s*\d|first[, :]|then[, :]|next[, :]|finally[, :])\b/i.test(content);
  const exampleHasReasoning =
    exampleText.length >= 220 &&
    /\b(?:because|therefore|substitut|calculat|solve|answer|step)\b/i.test(exampleText);
  if (!hasSteps && !exampleHasReasoning) issues.push("missing-step-by-step");

  if (exampleText.length < 220 || !/\b(?:answer|solution|therefore|because|calculat|solve)\b/i.test(exampleText)) {
    issues.push("weak-worked-example");
  }

  if (
    checkpointText.length < 80 ||
    !/\b(?:answer|correct|because|why|check|solution)\b/i.test(checkpointText)
  ) {
    issues.push("weak-checkpoint");
  }

  if (questionCount(practiceText) < 2 && !/(?:question|problem|exercise)\s*(?:1|one).*?(?:question|problem|exercise)\s*(?:2|two)/i.test(practiceText)) {
    issues.push("weak-practice");
  }

  if (specificityCount < 5) issues.push("missing-specificity");
  if (duplicateRatio(blocks) >= 0.16) issues.push("repetition");

  let score = 100;
  score -= Math.min(24, Math.max(0, MIN_CONTENT - contentLength) / 18);
  score -= Math.min(15, Math.max(0, MIN_BLOCKS - blockCount) * 2);
  score -= (8 - typeCount) * 5;
  score -= Math.max(0, 6 - signalCount) * 3;
  score -= Math.max(0, 5 - specificityCount) * 4;
  if (issues.includes("weak-worked-example")) score -= 7;
  if (issues.includes("weak-checkpoint")) score -= 5;
  if (issues.includes("weak-practice")) score -= 7;
  if (issues.includes("repetition")) score -= 15;
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    passed: issues.length === 0 && score >= 85,
    score,
    contentLength,
    blockCount,
    typeCount,
    signalCount,
    issues,
  };
}
