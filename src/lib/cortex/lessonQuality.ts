export interface LessonQualityBlock {
  type?: string;
  title?: string;
  content?: string;
}

export type LessonQualityIssue =
  | "too-short" | "too-few-blocks" | "missing-objective" | "missing-concept"
  | "missing-worked-example" | "missing-checkpoint" | "missing-exam-application"
  | "missing-misconception" | "missing-summary" | "missing-practice" | "missing-step-by-step"
  | "missing-specificity" | "weak-worked-example" | "weak-checkpoint" | "weak-practice"
  | "weak-prerequisite" | "weak-exam-application" | "weak-misconception" | "repetition";

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
const SPECIFICITY_SIGNALS = ["because", "therefore", "for example", "calculate", "equation", "formula", "unit", "symbol", "condition", "misconception", "answer", "given", "hence", "substitute", "derive"];
const MIN_CONTENT = 1200;
const MIN_BLOCKS = 9;

function normalise(value: string) { return value.toLowerCase().replace(/\s+/g, " ").trim(); }
function words(value: string) { return new Set(normalise(value).replace(/[^a-z0-9 ]/g, " ").split(" ").filter((word) => word.length >= 4)); }
function similarity(left: string, right: string) {
  const a = words(left); const b = words(right); if (!a.size || !b.size) return 0;
  let shared = 0; a.forEach((word) => { if (b.has(word)) shared += 1; });
  return shared / (a.size + b.size - shared);
}
function duplicateRatio(blocks: LessonQualityBlock[]) {
  const nonEmpty = blocks.map((block) => normalise(`${block.title ?? ""} ${block.content ?? ""}`)).filter((text) => text.length >= 40);
  if (nonEmpty.length < 4) return 0;
  let duplicates = 0; let comparisons = 0;
  for (let i = 0; i < nonEmpty.length; i += 1) for (let j = i + 1; j < nonEmpty.length; j += 1) {
    comparisons += 1; if (nonEmpty[i] === nonEmpty[j] || similarity(nonEmpty[i], nonEmpty[j]) >= 0.82) duplicates += 1;
  }
  return comparisons ? duplicates / comparisons : 0;
}
function hasType(blocks: LessonQualityBlock[], type: string) { return blocks.some((block) => normalise(block.type ?? "") === type); }
function blockText(blocks: LessonQualityBlock[], type: string) { return blocks.filter((block) => normalise(block.type ?? "") === type).map((block) => `${block.title ?? ""} ${block.content ?? ""}`).join(" "); }
function questionCount(text: string) {
  const questionMarks = (text.match(/\?/g) ?? []).length;
  const numberedQuestions = (text.match(/(?:^|[\s])(?:question\s*)?\d+[.)](?=\s)/gi) ?? []).length;
  return Math.max(questionMarks, numberedQuestions);
}

export function assessLessonQuality(blocks: LessonQualityBlock[]): LessonQualityResult {
  const content = blocks.map((block) => `${block.title ?? ""}\n${block.content ?? ""}`).join("\n").trim();
  const lower = normalise(content); const typeCount = REQUIRED_TYPES.filter((type) => hasType(blocks, type)).length;
  const signalCount = QUALITY_SIGNALS.filter((signal) => lower.includes(signal)).length;
  const specificityCount = SPECIFICITY_SIGNALS.filter((signal) => lower.includes(signal)).length;
  const issues: LessonQualityIssue[] = [];
  if (content.length < MIN_CONTENT) issues.push("too-short");
  if (blocks.length < MIN_BLOCKS) issues.push("too-few-blocks");
  if (!hasType(blocks, "objective")) issues.push("missing-objective");
  if (!hasType(blocks, "concept")) issues.push("missing-concept");
  if (!hasType(blocks, "example")) issues.push("missing-worked-example");
  if (!hasType(blocks, "checkpoint")) issues.push("missing-checkpoint");
  if (!hasType(blocks, "exam")) issues.push("missing-exam-application");
  if (!hasType(blocks, "misconception")) issues.push("missing-misconception");
  if (!hasType(blocks, "summary")) issues.push("missing-summary");
  if (!hasType(blocks, "practice")) issues.push("missing-practice");

  const prior = blockText(blocks, "prior");
  const example = blockText(blocks, "example");
  const checkpoint = blockText(blocks, "checkpoint");
  const misconception = blockText(blocks, "misconception");
  const exam = blockText(blocks, "exam");
  const practice = blockText(blocks, "practice");
  const hasSteps = /\b(?:step\s*\d|first[, :]|then[, :]|next[, :]|finally[, :])\b/i.test(content);
  const exampleHasReasoning = example.length >= 220 && /\b(?:because|therefore|substitut|calculat|solve|answer|step)\b/i.test(example);
  if (!hasSteps && !exampleHasReasoning) issues.push("missing-step-by-step");
  if (example.length < 220 || !/\b(?:answer|solution|therefore|because|calculat|solve)\b/i.test(example)) issues.push("weak-worked-example");
  if (checkpoint.length < 80 || !/\b(?:answer|correct|because|why|check|solution)\b/i.test(checkpoint)) issues.push("weak-checkpoint");
  if (questionCount(practice) < 2 && !/(?:question|problem|exercise)\s*(?:1|one).*?(?:question|problem|exercise)\s*(?:2|two)/i.test(practice)) issues.push("weak-practice");
  if (prior.length > 0 && prior.length < 80) issues.push("weak-prerequisite");
  if (exam.length < 120 || !/\b(?:mark|exam|question|application|method|answer|reasoning)\b/i.test(exam)) issues.push("weak-exam-application");
  if (misconception.length < 100 || !/\b(?:because|correct|instead|confuse|mistake|misconception|wrong)\b/i.test(misconception)) issues.push("weak-misconception");
  if (specificityCount < 5) issues.push("missing-specificity");
  if (duplicateRatio(blocks) >= 0.16) issues.push("repetition");

  let score = 100;
  score -= Math.min(24, Math.max(0, MIN_CONTENT - content.length) / 18);
  score -= Math.min(15, Math.max(0, MIN_BLOCKS - blocks.length) * 2);
  score -= (8 - typeCount) * 5;
  score -= Math.max(0, 6 - signalCount) * 3;
  score -= Math.max(0, 5 - specificityCount) * 4;
  if (issues.includes("weak-worked-example")) score -= 7;
  if (issues.includes("weak-checkpoint")) score -= 5;
  if (issues.includes("weak-practice")) score -= 7;
  if (issues.includes("weak-exam-application")) score -= 5;
  if (issues.includes("weak-misconception")) score -= 5;
  if (issues.includes("repetition")) score -= 15;
  score = Math.max(0, Math.min(100, Math.round(score)));
  return { passed: issues.length === 0 && score >= 85, score, contentLength: content.length, blockCount: blocks.length, typeCount, signalCount, issues };
}
