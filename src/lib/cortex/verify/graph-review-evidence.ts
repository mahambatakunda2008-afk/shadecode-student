import type { MarkingResourceTextLine } from "./marking-resource-extraction";

export type GraphReviewHintType = "axis" | "unit" | "scale" | "coordinate" | "plot_instruction" | "trend_or_gradient" | "diagram_label";

export type GraphReviewHint = {
  type: GraphReviewHintType;
  page: number;
  line: number;
  sourceText: string;
  confidence: "candidate";
  interpretation: "unverified";
  /** Parsed strings/values copied from source text, never treated as visual measurements. */
  candidateDetails: string[];
};

const COORDINATE_PAIR_RE = /\(([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\)/g;
const AXIS_LABEL_RE = /\b([xy])[ -]?axis\b(?:\s*(?:labelled|labeled|is|:)?\s*([^.;]{1,60}?))?(?=\s+(?:and\s+the\s+)?[xy][ -]?axis\b|[.;]|$)/gi;
const UNIT_CANDIDATE_RE = /\b(?:cm|mm|km|m|ms|s|kg|g|mol|N|newtons?|volts?|amperes?|A|V|J|W|Pa|Hz|degrees?|°C)\b/g;

function extractCandidateDetails(text: string, type: GraphReviewHintType): string[] {
  const details: string[] = [];
  if (type === "coordinate") {
    for (const match of text.matchAll(COORDINATE_PAIR_RE)) {
      details.push(`Coordinate candidate: (${match[1]}, ${match[2]})`);
    }
    if (!details.length) {
      const equals = text.match(/\bx\s*=\s*[+-]?\d+(?:\.\d+)?\s*[,; ]+\by\s*=\s*[+-]?\d+(?:\.\d+)?/i);
      if (equals) details.push(`Coordinate notation candidate: ${equals[0]}`);
    }
  }
  if (type === "axis") {
    const axisSegments = text.split(/\s+and\s+the\s+(?=[xy][ -]?axis\b)/i);
    for (const segment of axisSegments) {
      const match = segment.match(/\b([xy])[ -]?axis\b(?:\s*(?:labelled|labeled|is|:)?\s*([^.;]{1,60}))?/i);
      if (!match) continue;
      const label = match[2]?.trim();
      details.push(label ? `${match[1].toUpperCase()}-axis label candidate: ${label}` : `${match[1].toUpperCase()}-axis reference`);
    }
  }
  if (type === "unit") {
    const units = [...new Set(text.match(UNIT_CANDIDATE_RE) || [])];
    if (units.length) details.push(`Unit candidates: ${units.join(", ")}`);
  }
  if (type === "scale") {
    const scale = text.match(/\b(?:scale|each division|per square|per centimetre|per cm)\b[^.;]{0,80}/i);
    if (scale) details.push(`Scale wording candidate: ${scale[0].trim()}`);
  }
  return details;
}

const RULES: Array<{ type: GraphReviewHintType; pattern: RegExp }> = [
  { type: "axis", pattern: /\b(?:x|y)[ -]?axis\b|\bhorizontal axis\b|\bvertical axis\b/i },
  { type: "unit", pattern: /\b(?:units?|unit of|measured in|\bcm\b|\bmm\b|\bkm\b|\bms\^-?1\b|\bs\^-?1\b|\bmol\b|\bkg\b|\bnewtons?\b|\bvolts?\b|\bamperes?\b|(?:time|distance|length|mass|current|voltage|force|frequency)\s*[/|]\s*(?:m|s|kg|g|A|V|N|Hz))\b/i },
  { type: "scale", pattern: /\b(?:scale|scales|intervals?|each division|per square|per centimetre|per cm)\b/i },
  { type: "coordinate", pattern: /\bcoordinates?\b|\([+-]?\d+(?:\.\d+)?\s*,\s*[+-]?\d+(?:\.\d+)?\)/i },
  { type: "plot_instruction", pattern: /\b(?:plot|mark|draw|sketch|construct)\b.{0,60}\b(?:graph|curve|points?|axis|line)\b/i },
  { type: "trend_or_gradient", pattern: /\b(?:gradient|slope|intercept|best[- ]fit|tangent|increasing|decreasing|proportional)\b/i },
  { type: "diagram_label", pattern: /\b(?:label|labelled|labeled|annotate|key|legend)\b/i },
];

/** Extracts review anchors only. It never calculates plotted values or interprets a diagram. */
export function collectGraphReviewHints(lines: MarkingResourceTextLine[]): GraphReviewHint[] {
  const hints: GraphReviewHint[] = [];
  for (const line of lines) {
    for (const rule of RULES) {
      if (rule.pattern.test(line.text)) {
        hints.push({
          type: rule.type,
          page: line.page,
          line: line.line,
          sourceText: line.text,
          confidence: "candidate",
          interpretation: "unverified",
          candidateDetails: extractCandidateDetails(line.text, rule.type),
        });
      }
    }
  }
  return hints;
}
