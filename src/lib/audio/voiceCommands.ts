/**
 * src/lib/audio/voiceCommands.ts
 *
 * Matches a raw speech-to-text transcript to one of a fixed set of
 * playback commands. Pure and testable -- no SpeechRecognition API
 * dependency here, that lives in the lesson page component.
 *
 * Deliberately only listens for a command during the pause between
 * narrated blocks, never while narration is actively speaking -- if
 * the student is on speaker rather than headphones, the microphone
 * would otherwise pick up the app's own voice and misfire. See
 * docs/AUDIO_LESSONS_SPEC.md for the full design and the honest limit
 * on this: it only works with the screen on and the tab active, not
 * with the phone in a pocket and the screen locked -- mobile browsers
 * suspend background tabs, so a true hands-free-in-pocket experience
 * would need a native app with a background service, not something
 * a web app can do.
 */

export type VoiceCommand = "pause" | "resume" | "next" | "previous" | "repeat" | "explain";

const COMMAND_PATTERNS: Record<VoiceCommand, string[]> = {
  pause: ["pause", "stop", "hold on", "wait"],
  resume: ["resume", "play", "continue", "go on", "keep going", "carry on"],
  next: ["next", "skip", "move on", "skip ahead"],
  previous: ["back", "previous", "go back", "rewind"],
  repeat: ["repeat", "again", "say that again", "one more time", "come again"],
  explain: ["explain", "i don't understand", "elaborate", "what does that mean", "can you explain"],
};

/**
 * Matches longer, more specific phrases first so "say that again" isn't
 * mistakenly caught by a shorter unrelated pattern first (order of the
 * Object.entries iteration would otherwise depend on object key order,
 * which isn't a reliable matching strategy on its own).
 */
export function matchVoiceCommand(transcript: string): VoiceCommand | null {
  const normalized = transcript.toLowerCase().trim();
  if (!normalized) return null;

  const allPatterns = Object.entries(COMMAND_PATTERNS).flatMap(([command, patterns]) =>
    patterns.map((pattern) => ({ command: command as VoiceCommand, pattern }))
  );

  allPatterns.sort((a, b) => b.pattern.length - a.pattern.length);

  const hit = allPatterns.find(({ pattern }) => normalized.includes(pattern));
  return hit ? hit.command : null;
}
