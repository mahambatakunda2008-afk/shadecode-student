import type { MarkingResourceTextLine } from "./marking-resource-extraction";

export type GraphReviewHintType = "axis" | "unit" | "scale" | "coordinate" | "plot_instruction" | "trend_or_gradient" | "diagram_label";

export type GraphReviewHint = {
  type: GraphReviewHintType;
  page: number;
  line: number;
  sourceText: string;
  confidence: "candidate";
  interpretation: "unverified";
};

const RULES: Array<{ type: GraphReviewHintType; pattern: RegExp }> = [
  { type: "axis", pattern: /\b(?:x|y)[ -]?axis\b|\bhorizontal axis\b|\bvertical axis\b/i },
  { type: "unit", pattern: /\b(?:units?|unit of|measured in|\bcm\b|\bmm\b|\bkm\b|\bms\^-?1\b|\bs\^-?1\b|\bmol\b|\bkg\b|\bnewtons?\b|\bvolts?\b|\bamperes?\b)\b/i },
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
        });
      }
    }
  }
  return hints;
}
