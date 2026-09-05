export interface LessonQualityBlock {
  type?: string;
  title?: string;
  content?: string;
}

export interface LessonQualityResult {
  passed: boolean;
  contentLength: number;
  blockCount: number;
  typeCount: number;
  signalCount: number;
}

const REQUIRED_TYPES = ["objective", "concept", "example", "checkpoint", "exam", "mistake", "summary", "practice"];
const QUALITY_SIGNALS = ["example", "check", "practice", "mistake", "trap", "summary", "exam", "step"];

export function assessLessonQuality(blocks: LessonQualityBlock[]): LessonQualityResult {
  const content = blocks.map(block => `${block.title ?? ""}\n${block.content ?? ""}`).join("\n").trim();
  const lower = content.toLowerCase();
  const typeCount = REQUIRED_TYPES.filter(type => blocks.some(block => block.type === type)).length;
  const signalCount = QUALITY_SIGNALS.filter(signal => lower.includes(signal)).length;
  const blockCount = blocks.length;
  const contentLength = content.length;
  const substantive = contentLength >= 1200 && blockCount >= 9;
  return {
    passed: substantive && typeCount >= 7 && signalCount >= 6,
    contentLength,
    blockCount,
    typeCount,
    signalCount,
  };
}
