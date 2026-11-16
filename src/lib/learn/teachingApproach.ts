/**
 * src/lib/learn/teachingApproach.ts
 *
 * The /learn topic box carries both the topic and an optional "Teaching approach"
 * instruction. The server rejects topics over MAX_TOPIC_CHARS, and a textarea's
 * maxLength does NOT limit text set from code, so the quick-start buttons used to
 * stack instructions past the limit (a 586-char topic failed every attempt).
 * These helpers keep exactly one approach, and never silently cut the student's topic.
 */

export const MAX_TOPIC_CHARS = 500;
const MARKER = "\n\nTeaching approach:";

/** The student's own topic, with any previously added teaching approach removed. */
export function topicWithoutApproach(current: string): string {
  return current.split(MARKER)[0].trim();
}

export interface ApproachResult {
  text: string;
  /** False when adding the approach would exceed the limit; text is then left unchanged. */
  fits: boolean;
}

/** Replaces (never stacks) the teaching approach. If it cannot fit, the topic is left untouched. */
export function applyTeachingApproach(current: string, prompt: string, max: number = MAX_TOPIC_CHARS): ApproachResult {
  const base = topicWithoutApproach(current);
  if (!base) return { text: prompt.slice(0, max), fits: prompt.length <= max };
  const combined = `${base}${MARKER} ${prompt}`;
  if (combined.length <= max) return { text: combined, fits: true };
  return { text: current, fits: false };
}

export function topicTooLongMessage(length: number, max: number = MAX_TOPIC_CHARS): string {
  return `Your topic and teaching style are too long (${length}/${max} characters). Shorten the topic and try again.`;
}
