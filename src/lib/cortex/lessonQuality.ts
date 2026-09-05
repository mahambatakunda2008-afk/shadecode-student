export interface LessonQualityBlock {
  type?: string;
  title?: string;
  content?: string;
}

export type LessonQualityIssue = "too-short" | "too-few-blocks" | "missing-objective" | "missing-concept" | "missing-worked-example" | "missing-checkpoint" | "missing-exam-application" | "missing-misconception" | "missing-summary" | "missing-practice" | "missing-step-by-step" | "missing-specificity" | "repetition";

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
const SPECIFICITY_SIGNALS = ["because", "therefore", "for example", "calculate", "equation", "formula", "unit", "symbol", "condition", "misconception", "answer"];
const MIN_CONTENT = 1200;
const MIN_BLOCKS = 9;

function normalise(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function duplicateRatio(blocks: LessonQualityBlock[]) {
  const fingerprints = blocks.map((block) => normalise(`${block.title ?? ""} ${block.content ?? ""}`)).filter(Boolean).map((text) => text.replace(/[^a-z0-9 ]/g, "").slice(0, 180));
  if (fingerprints.length < 4) return 0;
  return 1 - new Set(fingerprints).size / fingerprints.length;
}

export function assessLessonQuality(blocks: LessonQualityBlock[]): LessonQualityResult {
  const content = blocks.map((block) => `${block.title ?? ""}\n${block.content ?? ""}`).join("\n").trim();
  const lower = normalise(content);
  const typeCount = REQUIRED_TYPES.filter((type) => blocks.some((block) => normalise(block.type ?? "") === type)).length;
  const signalCount = QUALITY_SIGNALS.filter((signal) => lower.includes(signal)).length;
  const specificityCount = SPECIFICITY_SIGNALS.filter((signal) => lower.includes(signal)).length;
  const contentLength = content.length;
  const blockCount = blocks.length;
  const issues: LessonQualityIssue[] = [];

  if (contentLength < MIN_CONTENT) issues.push("too-short");
  if (blockCount < MIN_BLOCKS) issues.push("too-few-blocks");
  if (!blocks.some((block) => block.type === "objective")) issues.push("missing-objective");
  if (!blocks.some((block) => block.type === "concept")) issues.push("missing-concept");
  if (!blocks.some((block) => block.type === "example")) issues.push("missing-worked-example");
  if (!blocks.some((block) => block.type === "checkpoint")) issues.push("missing-checkpoint");
  if (!blocks.some((block) => block.type === "exam")) issues.push("missing-exam-application");
  if (!blocks.some((block) => block.type === "misconception")) issues.push("missing-misconception");
  if (!blocks.some((block) => block.type === "summary")) issues.push("missing-summary");
  if (!blocks.some((block) => block.type === "practice")) issues.push("missing-practice");

  const exampleText = blocks.filter((block) => block.type === "example").map((block) => block.content ?? "").join(" ");
  const hasSteps = /\b(step\s*\d|first[, ]|then[, ]|next[, ]|finally[, ])\b/i.test(content);
  const exampleHasReasoning = exampleText.length >= 180 && /\b(step|because|therefore|substitut|calculat|answer)\b/i.test(exampleText);
  if (!hasSteps && !exampleHasReasoning) issues.push("missing-step-by-step");
  if (specificityCount < 4) issues.push("missing-specificity");
  if (duplicateRatio(blocks) >= 0.45) issues.push("repetition");

  let score = 100;
  score -= Math.min(25, Math.max(0, MIN_CONTENT - contentLength) / 20);
  score -= Math.min(15, Math.max(0, MIN_BLOCKS - blockCount) * 2);
  score -= (8 - typeCount) * 5;
  score -= Math.max(0, 6 - signalCount) * 3;
  score -= Math.max(0, 4 - specificityCount) * 4;
  if (issues.includes("repetition")) score -= 15;
  score = Math.max(0, Math.min(100, Math.round(score)));

  return { passed: issues.length === 0 && score >= 85, score, contentLength, blockCount, typeCount, signalCount, issues };
}
