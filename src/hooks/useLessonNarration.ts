"use client";

/**
 * src/hooks/useLessonNarration.ts
 *
 * Orchestrates SpeechSynthesis (narration) and SpeechRecognition (voice
 * commands) around the tested pure logic in src/lib/audio/narration.ts
 * and src/lib/audio/voiceCommands.ts. Kept as thin as the browser APIs
 * allow -- the actual command-matching and script-building logic is
 * fully unit tested; this hook is the untested browser-API wiring
 * around it, following the same split established for
 * src/lib/async/withTimeout.ts + NextActionDashboard.tsx.
 *
 * Cycle: speak one block -> once speech ends, listen for a short voice
 * command -> act on it, or auto-continue if nothing was heard. Never
 * listens while actively speaking, so a phone on speaker (not
 * headphones) doesn't hear its own narration and misfire a command.
 *
 * Real, disclosed limit: this only works with the screen on and the
 * tab in the foreground. Mobile browsers suspend background tabs on
 * screen lock, so this cannot run with the phone in a pocket and the
 * screen off -- that would need a native app with a background
 * service. See docs/AUDIO_LESSONS_SPEC.md.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { buildNarrationScript, type LessonBlock, type NarrationSegment } from "@/lib/audio/narration";
import { matchVoiceCommand } from "@/lib/audio/voiceCommands";

// SpeechRecognition isn't in default TS DOM lib types, and browsers
// vary in whether it's exposed as SpeechRecognition or the
// webkit-prefixed name.
interface MinimalSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: { transcript: string }[][] }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => MinimalSpeechRecognition;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type NarrationStatus = "idle" | "speaking" | "listening" | "unsupported";

const COMMAND_LISTEN_WINDOW_MS = 4000;

export function useLessonNarration(blocks: LessonBlock[]) {
  const [status, setStatus] = useState<NarrationStatus>("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [voiceCommandsSupported, setVoiceCommandsSupported] = useState(false);

  const scriptRef = useRef<NarrationSegment[]>([]);
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    scriptRef.current = buildNarrationScript(blocks);
    setVoiceCommandsSupported(getSpeechRecognitionConstructor() !== null);
  }, [blocks]);

  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const stop = useCallback(() => {
    activeRef.current = false;
    if (speechSupported) window.speechSynthesis.cancel();
    recognitionRef.current?.abort();
    setStatus("idle");
  }, [speechSupported]);

  const listenForCommand = useCallback(() => {
    // References speakIndex, declared further down in this same hook
    // body -- valid via closures (by the time this callback actually
    // fires, in response to a real speech event, speakIndex has already
    // been assigned for this render pass), but non-obvious at a glance.
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition || !activeRef.current) {
      // No voice command support -- just auto-continue after a short
      // pause, so the on-screen Listen button still works standalone.
      setTimeout(() => activeRef.current && speakIndex(currentIndex + 1), 600);
      return;
    }

    setStatus("listening");
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    const timeoutId = setTimeout(() => {
      recognition.abort();
    }, COMMAND_LISTEN_WINDOW_MS);

    recognition.onresult = (event) => {
      clearTimeout(timeoutId);
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      const command = matchVoiceCommand(transcript);
      if (!activeRef.current) return;

      switch (command) {
        case "pause":
          stop();
          return;
        case "previous":
          speakIndex(Math.max(0, currentIndex - 1));
          return;
        case "repeat":
          speakIndex(currentIndex);
          return;
        case "next":
        case "resume":
        default:
          speakIndex(currentIndex + 1);
      }
    };

    recognition.onerror = () => {
      clearTimeout(timeoutId);
      if (activeRef.current) speakIndex(currentIndex + 1);
    };

    recognition.onend = () => {
      clearTimeout(timeoutId);
      // onresult already advanced if a command was heard; this handles
      // the "nothing heard, recognition just ended" case.
      if (activeRef.current && status === "listening") speakIndex(currentIndex + 1);
    };

    recognition.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, stop]);

  const speakIndex = useCallback(
    (index: number) => {
      if (!speechSupported || index >= scriptRef.current.length) {
        stop();
        return;
      }

      activeRef.current = true;
      setCurrentIndex(index);
      setStatus("speaking");

      const segment = scriptRef.current[index];
      const utterance = new SpeechSynthesisUtterance(segment.text);
      utterance.rate = 1;
      utterance.onend = () => {
        if (activeRef.current) listenForCommand();
      };
      utterance.onerror = () => {
        if (activeRef.current) listenForCommand();
      };

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [speechSupported, stop]
  );

  const start = useCallback(() => speakIndex(0), [speakIndex]);
  const skipNext = useCallback(() => speakIndex(currentIndex + 1), [speakIndex, currentIndex]);
  const skipPrevious = useCallback(() => speakIndex(Math.max(0, currentIndex - 1)), [speakIndex, currentIndex]);
  const repeat = useCallback(() => speakIndex(currentIndex), [speakIndex, currentIndex]);

  useEffect(() => () => stop(), [stop]);

  return {
    status,
    currentIndex,
    totalSegments: scriptRef.current.length,
    speechSupported,
    voiceCommandsSupported,
    start,
    stop,
    skipNext,
    skipPrevious,
    repeat,
  };
}
