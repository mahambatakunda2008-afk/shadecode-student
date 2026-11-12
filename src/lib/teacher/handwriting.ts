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
  notationWarnings: HandwritingNotationWarning[];
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

export type HandwritingNotationWarning = "numbers" | "equations" | "units" | "chemical formulae" | "scientific symbols";

/** Detect protected notation changed by the OCR correction pass. A change is a review flag, never an automatic rejection. */
export function findHandwritingNotationWarnings(transcript: string, correctedText: string): HandwritingNotationWarning[] {
  if (!transcript || !correctedText || transcript === correctedText) return [];
  const occurrences = (value: string, pattern: RegExp) => [...value.matchAll(pattern)]
    .map(match => ({ index: match.index ?? 0, token: match[0] }));
  // Arithmetic operators are protected only between mathematical operands, not prose punctuation.
  const arithmeticOperators = /[A-Za-zΑ-Ωα-ω0-9)]\\s*(?:[+−×÷*/^]|\\s-\\s)\\s*[A-Za-zΑ-Ωα-ω0-9]/g;
  const checks: Array<[HandwritingNotationWarning, RegExp]> = [
    ["numbers", /\b\d+(?:[.,]\d+)?(?:[eE][+-]?\d+)?\b/g],
    ["equations", /\b[A-Za-z][A-Za-z0-9_]*\s*(?:=|≈|≠|≤|≥|<|>)\s*[A-Za-z0-9_α-ωΑ-Ωπμλθ√∞.+\-*/^()]+/g],
    ["units", /(?<=\d)\s*(?:mmHg|cmH2O|km|cm|mm|µm|μm|nm|kg|mg|µg|g|mol|mmol|kPa|MPa|Pa|mL|L|m3|cm3|m³|cm³|m²|cm²|ms|min|h|s|mA|A|mV|V|kW|W|kJ|J|kN|N|MHz|kHz|Hz|°C|K)\b/g],
    ["chemical formulae", /\b[A-Z][a-z]?\d*(?:[A-Z][a-z]?\d*)+\b/g],
    ["scientific symbols", /[α-ωΑ-ΩπμλθΔ∑∫√∞±×÷≤≥≈≠∝°µ²³⁰¹⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉]/g],
  ];
  return checks.filter(([label, pattern]) => {
    const original = occurrences(transcript, pattern);
    const corrected = occurrences(correctedText, pattern);
    if (label === "scientific symbols") {
      original.push(...occurrences(transcript, arithmeticOperators));
      corrected.push(...occurrences(correctedText, arithmeticOperators));
      original.sort((a, b) => a.index - b.index);
      corrected.sort((a, b) => a.index - b.index);
    }
    return JSON.stringify(original.map(item => item.token)) !== JSON.stringify(corrected.map(item => item.token));
  }).map(([label]) => label);
}

export function normalizeHandwritingRecognition(payload: RecognitionPayload): HandwritingRecognition {
  const transcript = typeof payload.transcript === "string" ? payload.transcript.trim().slice(0, 12000) : "";
  const correctedText = typeof payload.correctedText === "string" ? payload.correctedText.trim().slice(0, 12000) : "";
  const uncertainCharacters = Array.isArray(payload.uncertainCharacters)
    ? payload.uncertainCharacters.slice(0, 100).map((entry: unknown): UncertainHandwritingCharacter => {
        const item = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
        const chosen = typeof item.chosen === "string" ? item.chosen.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 80) : "";
        return {
          seen: typeof item.seen === "string" ? item.seen.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 80) : "",
          chosen,
          alternatives: Array.isArray(item.alternatives)
            ? [...new Set(item.alternatives.filter((value): value is string => typeof value === "string").map(value => value.replace(/[\u0000-\u001f\u007f]/g, "").trim()).filter(value => value.length > 0 && value.length <= 24))]
                .filter(value => value !== chosen).slice(0, 5)
            : [],
          context: typeof item.context === "string" ? item.context.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 160) : "",
          reason: typeof item.reason === "string" ? item.reason.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 240) : "",
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
  const notationWarnings = findHandwritingNotationWarnings(transcript, correctedText || transcript);
  return {
    transcript,
    correctedText: correctedText || transcript,
    confidence,
    uncertainCharacters,
    mathExpressions,
    requiresReview: uncertainCharacters.length > 0 || notationWarnings.length > 0 || mathExpressions.some(item => item.uncertainTokens.length > 0 || item.confidence === null || item.confidence < 0.9) || confidence === null || confidence < 0.9,
    notationWarnings,
  };
}

export type HandwritingReviewRange = { start: number; end: number; seen: string; chosen: string };

/** Locate uncertain readings for inline highlighting without guessing repeated occurrences. */
export function findHandwritingReviewRanges(
  text: string,
  items: UncertainHandwritingCharacter[],
): HandwritingReviewRange[] {
  const ranges: HandwritingReviewRange[] = [];
  for (const item of items) {
    const candidates = [item.chosen, "[unclear]", item.seen].filter((value, index, all) => value.trim() && all.indexOf(value) === index);
    const context = item.context.trim();
    let match: { start: number; end: number } | null = null;
    if (context) {
      const contextStart = text.indexOf(context);
      if (contextStart >= 0 && text.indexOf(context, contextStart + context.length) < 0) {
        for (const candidate of candidates) {
          const tokenStart = context.indexOf(candidate);
          if (tokenStart >= 0 && context.indexOf(candidate, tokenStart + candidate.length) < 0) {
            match = { start: contextStart + tokenStart, end: contextStart + tokenStart + candidate.length };
            break;
          }
        }
      }
    }
    if (!match) {
      for (const candidate of candidates) {
        const start = text.indexOf(candidate);
        if (start >= 0 && text.indexOf(candidate, start + candidate.length) < 0) {
          match = { start, end: start + candidate.length };
          break;
        }
      }
    }
    if (match && !ranges.some(range => match!.start < range.end && match!.end > range.start)) {
      ranges.push({ ...match, seen: item.seen, chosen: item.chosen });
    }
  }
  return ranges.sort((a, b) => a.start - b.start);
}

/** Apply a human-selected OCR candidate only when its location is unambiguous. */
export function applyHandwritingAlternative(
  text: string,
  item: UncertainHandwritingCharacter,
  alternative: string,
): string | null {
  const safeAlternative = alternative.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!safeAlternative || safeAlternative.length > 24 || !item.alternatives.includes(safeAlternative)) return null;
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
          return text.slice(0, start) + safeAlternative + text.slice(start + candidate.length);
        }
      }
    }
  }
  for (const candidate of candidates) {
    const index = text.indexOf(candidate);
    if (index >= 0 && text.indexOf(candidate, index + candidate.length) < 0) {
      return text.slice(0, index) + safeAlternative + text.slice(index + candidate.length);
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


/** Score an OCR candidate without allowing uncertainty to be hidden by confidence alone. */
export function handwritingRecognitionScore(confidence: unknown, uncertainCount: number): number {
  const score = typeof confidence === "number" && Number.isFinite(confidence)
    ? Math.max(0, Math.min(1, confidence)) : 0;
  const uncertainty = Number.isFinite(uncertainCount) ? Math.max(0, Math.min(100, Math.floor(uncertainCount))) : 0;
  return score - uncertainty * 0.035;
}

/** Prefer an untouched-image retry only when it supplies usable text and a stronger score. */
export function shouldUseHandwritingRetry(current: {
  text: unknown; confidence: unknown; uncertainCount: number;
}, retry: {
  text: unknown; confidence: unknown; uncertainCount: number;
}): boolean {
  const retryText = typeof retry.text === "string" ? retry.text.trim() : "";
  const currentText = typeof current.text === "string" ? current.text.trim() : "";
  if (!retryText) return false;
  if (!currentText) return true;
  return handwritingRecognitionScore(retry.confidence, retry.uncertainCount)
    > handwritingRecognitionScore(current.confidence, current.uncertainCount);
}
