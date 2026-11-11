export type UncertainHandwritingCharacter = {
  seen: string;
  chosen: string;
  alternatives: string[];
  context: string;
  reason: string;
};

export type HandwritingMathExpression = {
  sourceText: string;
  latex: string;
  confidence: number | null;
  uncertainTokens: string[];
};

export type HandwritingRecognition = {
  transcript: string;
  correctedText: string;
  confidence: number | null;
  uncertainCharacters: UncertainHandwritingCharacter[];
  mathExpressions: HandwritingMathExpression[];
  requiresReview: boolean;
};

type RecognitionPayload = {
  transcript?: unknown;
  correctedText?: unknown;
  confidence?: unknown;
  uncertainCharacters?: unknown;
  mathExpressions?: unknown;
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
  const mathExpressions = Array.isArray(payload.mathExpressions)
    ? payload.mathExpressions.slice(0, 40).flatMap((entry): HandwritingMathExpression[] => {
        if (!entry || typeof entry !== "object") return [];
        const item = entry as Record<string, unknown>;
        const sourceText = typeof item.sourceText === "string" ? item.sourceText.trim().slice(0, 500) : "";
        const latex = typeof item.latex === "string" ? item.latex.trim().slice(0, 1000) : "";
        if (!sourceText || !latex || /[<>]/.test(latex)) return [];
        const score = typeof item.confidence === "number" && Number.isFinite(item.confidence)
          ? Math.max(0, Math.min(1, item.confidence)) : null;
        const uncertainTokens = Array.isArray(item.uncertainTokens)
          ? item.uncertainTokens.filter((value): value is string => typeof value === "string").slice(0, 20).map(value => value.slice(0, 40)) : [];
        return [{ sourceText, latex, confidence: score, uncertainTokens }];
      })
    : [];
  return {
    transcript,
    correctedText: correctedText || transcript,
    confidence,
    uncertainCharacters,
    mathExpressions,
    requiresReview: uncertainCharacters.length > 0 || mathExpressions.some(item => item.uncertainTokens.length > 0 || item.confidence === null || item.confidence < 0.9) || confidence === null || confidence < 0.9,
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


export type HandwritingImageValidation = { valid: true } | { valid: false; error: string };

/** Validate encoded image size and file signature before forwarding it to a vision provider. */
export function validateHandwritingImageData(image: string, mimeType: string): HandwritingImageValidation {
  if (mimeType !== "image/png" && mimeType !== "image/jpeg") {
    return { valid: false, error: "Only PNG and JPEG handwriting images are supported." };
  }
  if (!image || image.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(image)) {
    return { valid: false, error: "The handwriting image is not valid base64 data." };
  }
  const estimatedBytes = Math.floor(image.length * 3 / 4) - (image.endsWith("==") ? 2 : image.endsWith("=") ? 1 : 0);
  if (estimatedBytes < 8 || estimatedBytes > 3 * 1024 * 1024) {
    return { valid: false, error: "Provide a handwriting image between 8 bytes and 3 MiB." };
  }
  let bytes: Uint8Array;
  try {
    const binary = atob(image);
    bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  } catch {
    return { valid: false, error: "The handwriting image could not be decoded." };
  }
  const isPng = mimeType === "image/png" && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  const isJpeg = mimeType === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return isPng || isJpeg
    ? { valid: true }
    : { valid: false, error: "The image content does not match its declared PNG or JPEG type." };
}
