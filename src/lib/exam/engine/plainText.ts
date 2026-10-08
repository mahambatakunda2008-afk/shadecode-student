/**
 * src/lib/exam/engine/plainText.ts
 *
 * Converts the small LaTeX subset the engine emits into readable Unicode for
 * surfaces that do not render maths (the lesson quiz, plain-text sharing).
 */

const SUPER: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻", "+": "⁺" };
const SUB: Record<string, string> = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };

const mapChars = (value: string, table: Record<string, string>) => [...value].map((c) => table[c] ?? c).join("");

export function latexToPlain(input: string): string {
  let text = input.replace(/\$/g, "");

  // Nested \frac{a}{b}: resolve innermost first.
  for (let i = 0; i < 6 && /\\frac\{[^{}]*\}\{[^{}]*\}/.test(text); i++) {
    text = text.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, (_, a: string, b: string) => {
      const wrap = (part: string) => (/^[\w.]+$/.test(part) ? part : `(${part})`);
      return `${wrap(a)}/${wrap(b)}`;
    });
  }

  text = text
    .replace(/\\int_0\^\{([^{}]+)\}/g, "∫ from 0 to $1 of ")
    .replace(/\\int_0\^(\w+)/g, "∫ from 0 to $1 of ")
    .replace(/\\,/g, " ")
    .replace(/\\binom\{([^{}]+)\}\{([^{}]+)\}/g, "C($1, $2)")
    .replace(/\\log_\{(\d+)\}/g, (_, base: string) => `log${mapChars(base, SUB)}`)
    .replace(/\\left|\\right/g, "")
    .replace(/\\text\{([^{}]*)\}/g, "$1")
    .replace(/\^\\circ/g, "°")
    .replace(/\\circ/g, "°")
    .replace(/\\times/g, "×")
    .replace(/\\infty/g, "∞")
    .replace(/\\(sin|cos|tan|ln|log)/g, "$1")
    .replace(/\^\{([^{}]+)\}/g, (_, power: string) => mapChars(power, SUPER))
    .replace(/\^(-?\d)/g, (_, power: string) => mapChars(power, SUPER))
    .replace(/_\{([^{}]+)\}/g, (_, sub: string) => mapChars(sub, SUB))
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/[{}]/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s+([.,])/g, "$1");

  return text.trim();
}
