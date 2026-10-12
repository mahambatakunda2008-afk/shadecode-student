/**
 * src/lib/exam/engine/numeric.ts
 *
 * Numeric answer specification and an exact, offline marker.
 *
 * The marker reads what a student actually types ("12.5 m s^-1", "3.0 x 10^8",
 * "1/4", "−3") and compares it with the exact value inside a tolerance derived
 * from the requested significant figures. No model is involved, so it cannot
 * time out or disagree with itself.
 */

/** A classic wrong answer: a value a student gets by a known slip, with kind feedback. */
export interface NumericMistake {
  value: number;
  id: string;
  hint: string;
}

export interface NumericSpec {
  /** Unrounded correct value. */
  exact: number;
  /** Absolute tolerance around `exact`. */
  tolerance: number;
  unit?: string;
  /** Which generator built the question, so outcomes can be learned per question type. */
  generator?: string;
  /** Known mistakes for this question, used to diagnose a wrong answer. */
  mistakes?: NumericMistake[];
}

const SUPERSCRIPTS: Record<string, string> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-", "⁺": "+",
};

/** Rounds to `sf` significant figures and returns the tolerance that accepts any valid rounding. */
export function roundSF(value: number, sf: number): { value: number; tolerance: number } {
  if (!Number.isFinite(value) || value === 0) return { value: 0, tolerance: 1e-9 };
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const factor = 10 ** (sf - 1 - exponent);
  const rounded = Math.round(value * factor) / factor;
  // Half a unit in the last requested place, plus a hair for float noise.
  return { value: rounded, tolerance: 0.5 * 10 ** (exponent - sf + 1) * 1.0001 };
}

export function roundDP(value: number, dp: number): { value: number; tolerance: number } {
  const factor = 10 ** dp;
  return { value: Math.round(value * factor) / factor, tolerance: (0.5 / factor) * 1.0001 };
}

export function exactInteger(value: number): NumericSpec {
  return { exact: value, tolerance: 1e-6 };
}

export function formatNumber(value: number): string {
  if (Number.isInteger(value) && Math.abs(value) < 1e15) return String(value);
  const abs = Math.abs(value);
  if (abs !== 0 && (abs >= 1e6 || abs < 1e-3)) return value.toExponential(2).replace("e", " × 10^").replace("+", "");
  return String(Number(value.toPrecision(6)));
}

function normaliseText(raw: string): string {
  let text = raw.normalize("NFKC");
  text = text.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]/g, (character) => SUPERSCRIPTS[character] ?? character);
  text = text.replace(/[−–—]/g, "-");
  // 1,000 / 1 000 thousands separators.
  text = text.replace(/(\d),(\d{3})(?!\d)/g, "$1$2").replace(/(\d) (\d{3})(?!\d)/g, "$1$2");
  // 3,5 -> 3.5 (decimal comma).
  text = text.replace(/(\d),(\d{1,2})(?!\d)/g, "$1.$2");
  return text;
}

const TOKEN =
  /[+-]?\d+(?:\.\d+)?\s*(?:[x×*]\s*10\s*\^?\s*\(?[+-]?\d+\)?|[eE][+-]?\d+)|[+-]?\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?|[+-]?\d*\.\d+|[+-]?\d+/g;

function tokenValue(token: string): number | null {
  const sci = token.match(/^([+-]?\d+(?:\.\d+)?)\s*(?:[x×*]\s*10\s*\^?\s*\(?([+-]?\d+)\)?|[eE]([+-]?\d+))$/);
  if (sci) return Number(sci[1]) * 10 ** Number(sci[2] ?? sci[3]);
  const fraction = token.match(/^([+-]?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (fraction) return Number(fraction[2]) === 0 ? null : Number(fraction[1]) / Number(fraction[2]);
  const value = Number(token);
  return Number.isFinite(value) ? value : null;
}

/** Every plausible numeric answer in the text, in order, skipping unit exponents like the -1 in "m s-1". */
export function extractNumbers(raw: string): number[] {
  const text = normaliseText(raw);
  const values: number[] = [];
  TOKEN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN.exec(text)) !== null) {
    const previous = match.index > 0 ? text[match.index - 1] : "";
    if (/[A-Za-z^]/.test(previous)) continue; // unit exponent or a variable name such as v2
    const value = tokenValue(match[0].trim());
    if (value !== null) values.push(value);
  }
  return values;
}

/**
 * How close a typed answer must be to a known mistake to be diagnosed as it.
 * Scaled to the mistake's own size (the right answer's tolerance can be far larger or smaller),
 * with a little of the requested rounding allowed so 2 d.p. answers still match.
 */
export function mistakeAllowance(spec: Pick<NumericSpec, "tolerance">, mistakeValue: number): number {
  const integerAnswer = spec.tolerance <= 1e-6;
  if (integerAnswer && Number.isInteger(mistakeValue)) return 1e-6;
  const size = Math.abs(mistakeValue);
  return Math.max(size * 0.006, Math.min(spec.tolerance, size * 0.05), 1e-9);
}

export interface NumericMark {
  correct: boolean;
  /** The number we compared, when one was found. */
  matched: number | null;
  /** The known mistake the wrong answer matches, if any. */
  mistake?: { id: string; hint: string };
}

/** Accepts the answer when any number in the text is within tolerance (capped to avoid number-spraying). */
export function markNumeric(answer: string, spec: NumericSpec): NumericMark {
  const numbers = extractNumbers(answer);
  if (!numbers.length || numbers.length > 8) return { correct: false, matched: numbers.at(-1) ?? null };
  const slack = Math.abs(spec.exact) * 1e-9;
  const hit = numbers.find((value) => Math.abs(value - spec.exact) <= spec.tolerance + slack);
  if (hit !== undefined) return { correct: true, matched: hit };

  const matched = numbers.at(-1) ?? null;
  for (const candidate of spec.mistakes ?? []) {
    const allowance = mistakeAllowance(spec, candidate.value);
    if (numbers.some((value) => Math.abs(value - candidate.value) <= allowance)) return { correct: false, matched, mistake: { id: candidate.id, hint: candidate.hint } };
  }
  return { correct: false, matched };
}
