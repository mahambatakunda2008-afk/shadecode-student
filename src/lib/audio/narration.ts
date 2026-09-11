/**
 * src/lib/audio/narration.ts
 *
 * Turns lesson content blocks into a spoken-word script. Pure and
 * browser-API-free by design, so it's directly testable -- the actual
 * SpeechSynthesis playback lives in the lesson page component, kept
 * thin, matching the "extract pure logic, test that" pattern used
 * throughout this session (src/lib/exam/scoring.ts, src/lib/cortex/
 * retentionRisk.ts, etc).
 *
 * math-type blocks get a spoken substitute rather than reading raw
 * notation/LaTeX aloud, which would be unintelligible through TTS --
 * "See the formula on screen" is honest about what audio-only can't
 * convey, not a silent gap the student wouldn't understand.
 */

export interface LessonBlock {
  type: string;
  content: string;
}

export interface NarrationSegment {
  index: number;
  type: string;
  text: string;
}

const SPOKEN_PREFIX: Record<string, string> = {
  tip: "Tip. ",
  example: "For example. ",
};

/**
 * Strips the visual-only markup the lesson renderer understands ("- "/"1. "
 * list markers, "**bold**" emphasis) before content is spoken. Without this,
 * TTS reads the literal characters aloud ("dash", "asterisk asterisk"),
 * which is unintelligible. Content with no markup passes through unchanged.
 */
function speakable(content: string): string {
  const lines = content
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => line.replace(/^[-•]\s+/, "").replace(/^\d+[.)]\s+/, ""))
    .map(line => line.replace(/\*\*([^*]+)\*\*/g, "$1"));
  return lines.join(". ");
}

export function buildNarrationScript(blocks: LessonBlock[]): NarrationSegment[] {
  return blocks.map((block, index) => {
    if (block.type === "math") {
      return {
        index,
        type: block.type,
        text: "Here's a formula. Take a look at the screen for this one.",
      };
    }

    const prefix = SPOKEN_PREFIX[block.type] ?? "";
    return { index, type: block.type, text: `${prefix}${speakable(block.content)}` };
  });
}
