/**
 * src/lib/exam/mathText.ts
 *
 * Renders `$$display$$` and `$inline$` LaTeX in exam text to KaTeX HTML.
 * The inline rule previously required a trailing `$$`, so ordinary `$x^2$`
 * was shown as raw dollar signs.
 */

import katex from "katex";

export function renderMath(text: string): string {
  try {
    return (text || "")
      .replace(/\$\$([^$]+)\$\$/g, (_, expression: string) => katex.renderToString(expression, { displayMode: true, throwOnError: false }))
      .replace(/\$([^$\n]+)\$/g, (_, expression: string) => katex.renderToString(expression, { displayMode: false, throwOnError: false }));
  } catch {
    return text;
  }
}
