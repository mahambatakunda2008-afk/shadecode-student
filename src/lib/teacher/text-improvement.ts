/**
 * Reject editorial output that invents or alters protected source data.
 * Language may be improved; numbers, equations, notation, code and links must remain intact.
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
  const equationPattern = /\b[A-Za-z][A-Za-z0-9_]*\s*(?:=|≈|≠|≤|≥|<|>)\s*[A-Za-z0-9_α-ωΑ-Ωπμλθ√∞.()^²³]+(?:\s*[+\-*/^]\s*[A-Za-z0-9_α-ωΑ-Ωπμλθ√∞.()^²³]+)*/g;
  if (JSON.stringify(occurrences(source, equationPattern).sort()) !== JSON.stringify(occurrences(improved, equationPattern).sort())) {
    return { valid: false, reason: "The proposed edit changes an equation or variable relationship. The original wording has been preserved." };
  }
  const unitPattern = /(?<=\d)\s*(?:mmHg|cmH2O|km|cm|mm|µm|μm|nm|kg|mg|µg|g|mol|mmol|kPa|MPa|Pa|mL|L|m3|cm3|m³|cm³|m²|cm²|ms|min|h|s|mA|A|mV|V|kW|W|kJ|J|kN|N|MHz|kHz|Hz|°C|K)\b/g;
  if (JSON.stringify(occurrences(source, unitPattern).sort()) !== JSON.stringify(occurrences(improved, unitPattern).sort())) {
    return { valid: false, reason: "The proposed edit changes a measurement unit. The original wording has been preserved." };
  }
  const chemicalFormulaPattern = /\b[A-Z][a-z]?\d*(?:[A-Z][a-z]?\d*)+\b/g;
  if (JSON.stringify(occurrences(source, chemicalFormulaPattern).sort()) !== JSON.stringify(occurrences(improved, chemicalFormulaPattern).sort())) {
    return { valid: false, reason: "The proposed edit changes a chemical formula. The original wording has been preserved." };
  }
  const notationPattern = /[α-ωΑ-ΩπμλθΔ∑∫√∞±×÷≤≥≈≠∝°µ²³⁰¹⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉]/g;
  if (JSON.stringify(occurrences(source, notationPattern).sort()) !== JSON.stringify(occurrences(improved, notationPattern).sort())) {
    return { valid: false, reason: "The proposed edit changes scientific or mathematical notation. The original wording has been preserved." };
  }
  return { valid: true, text: improved };
}
