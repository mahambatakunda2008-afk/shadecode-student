/**
 * Reject editorial output that invents or alters protected source data.
 * Language may be improved; numeric values, code and links must remain intact.
 */
function occurrences(value: string, pattern: RegExp): string[] {
  return [...value.matchAll(pattern)].map(match => match[0]);
}

export type TeacherTextValidation =
  | { valid: true; text: string }
  | { valid: false; reason: string };

export function validateTeacherTextImprovement(original: string, candidate: string): TeacherTextValidation {
  const source = original.trim();
  const improved = candidate.trim();
  if (!source || !improved) return { valid: false, reason: "The improved text is empty." };
  if (improved.length > Math.max(120, source.length * 1.8) || improved.length < source.length * 0.45) {
    return { valid: false, reason: "The proposed edit changes the text too substantially." };
  }
  const numberPattern = /\b\d+(?:[.,]\d+)?(?:[eE][+-]?\d+)?\b/g;
  if (JSON.stringify(occurrences(source, numberPattern).sort()) !== JSON.stringify(occurrences(improved, numberPattern).sort())) {
    return { valid: false, reason: "The proposed edit changes a number. The original wording has been preserved." };
  }
  const protectedPattern = /`[^`\n]+`|https?:\/\/[^\s)]+/g;
  if (JSON.stringify(occurrences(source, protectedPattern).sort()) !== JSON.stringify(occurrences(improved, protectedPattern).sort())) {
    return { valid: false, reason: "The proposed edit changes code or a link. The original wording has been preserved." };
  }
  return { valid: true, text: improved };
}
