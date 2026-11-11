export type UncertainHandwritingCharacter = {
  seen: string;
  chosen: string;
  alternatives: string[];
  context: string;
  reason: string;
};

export type HandwritingRecognition = {
  transcript: string;
  correctedText: string;
  confidence: number | null;
  uncertainCharacters: UncertainHandwritingCharacter[];
  requiresReview: boolean;
};

type RecognitionPayload = {
  transcript?: unknown;
  correctedText?: unknown;
  confidence?: unknown;
  uncertainCharacters?: unknown;
};

export function parseHandwritingRecognition(text: string): RecognitionPayload | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const value: unknown = JSON.parse(cleaned);
    return value && typeof value === "object" && !Array.isArray(value) ? value as RecognitionPayload : null;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      const value: unknown = JSON.parse(cleaned.slice(start, end + 1));
      return value && typeof value === "object" && !Array.isArray(value) ? value as RecognitionPayload : null;
    } catch {
      return null;
    }
  }
}

export function normalizeHandwritingRecognition(payload: RecognitionPayload): HandwritingRecognition {
  const transcript = typeof payload.transcript === "string" ? payload.transcript.trim().slice(0, 12000) : "";
  const correctedText = typeof payload.correctedText === "string" ? payload.correctedText.trim().slice(0, 12000) : "";
  const uncertainCharacters = Array.isArray(payload.uncertainCharacters)
    ? payload.uncertainCharacters.slice(0, 100).map((entry: unknown): UncertainHandwritingCharacter => {
        const item = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
        return {
          seen: typeof item.seen === "string" ? item.seen.slice(0, 80) : "",
          chosen: typeof item.chosen === "string" ? item.chosen.slice(0, 80) : "",
          alternatives: Array.isArray(item.alternatives) ? item.alternatives.filter((value): value is string => typeof value === "string").slice(0, 5) : [],
          context: typeof item.context === "string" ? item.context.slice(0, 160) : "",
          reason: typeof item.reason === "string" ? item.reason.slice(0, 240) : "",
        };
      })
    : [];
  const confidence = typeof payload.confidence === "number" && Number.isFinite(payload.confidence)
    ? Math.max(0, Math.min(1, payload.confidence))
    : null;
  return {
    transcript,
    correctedText: correctedText || transcript,
    confidence,
    uncertainCharacters,
    requiresReview: uncertainCharacters.length > 0 || confidence === null || confidence < 0.9,
  };
}

/** Apply a human-selected OCR candidate only when its location is unambiguous. */
export function applyHandwritingAlternative(
  text: string,
  item: UncertainHandwritingCharacter,
  alternative: string,
): string | null {
  const candidates = [item.chosen, "[unclear]", item.seen].filter((value, index, all) => value.trim() && all.indexOf(value) === index);
  const context = item.context.trim();
  if (context) {
    const contextIndex = text.indexOf(context);
    if (contextIndex >= 0 && text.indexOf(context, contextIndex + context.length) < 0) {
      const contextText = text.slice(contextIndex, contextIndex + context.length);
      for (const candidate of candidates) {
        const tokenIndex = contextText.indexOf(candidate);
        if (tokenIndex >= 0 && contextText.indexOf(candidate, tokenIndex + candidate.length) < 0) {
          const start = contextIndex + tokenIndex;
          return text.slice(0, start) + alternative + text.slice(start + candidate.length);
        }
      }
    }
  }
  for (const candidate of candidates) {
    const index = text.indexOf(candidate);
    if (index >= 0 && text.indexOf(candidate, index + candidate.length) < 0) {
      return text.slice(0, index) + alternative + text.slice(index + candidate.length);
    }
  }
  return null;
}
