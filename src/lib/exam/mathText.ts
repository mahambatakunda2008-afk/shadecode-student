/**
 * src/lib/exam/mathText.ts
 *
 * Renders `$$display$$` and `$inline$` LaTeX in exam text to KaTeX HTML, and makes the rest of the text
 * safe to insert as HTML.
 *
 * Question text can come from an AI provider or, for battles, from another player's browser, so it is
 * untrusted. Everything outside the maths is HTML-escaped, except a short list of harmless formatting
 * tags (sub, sup, b, i, em, strong, br) that exam text legitimately uses.
 */

import katex from "katex";

const ALLOWED_TAGS = new Set(["sub", "sup", "b", "i", "em", "strong", "br"]);

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Escapes text but lets through bare, attribute-free tags from the allow list. */
export function sanitizePlainText(text: string): string {
  const parts = text.split(/(<\/?[a-zA-Z]+\s*\/?>)/g);
  return parts
    .map((part) => {
      const tag = part.match(/^<(\/?)([a-zA-Z]+)\s*\/?>$/);
      if (tag && ALLOWED_TAGS.has(tag[2].toLowerCase())) return `<${tag[1]}${tag[2].toLowerCase()}${tag[2].toLowerCase() === "br" ? " /" : ""}>`;
      return escapeHtml(part);
    })
    .join("");
}

const MATH = /\$\$([^$]+)\$\$|\$([^$\n]+)\$/g;

export function renderMath(text: string): string {
  const source = text || "";
  let result = "";
  let last = 0;
  for (const match of source.matchAll(MATH)) {
    result += sanitizePlainText(source.slice(last, match.index));
    const display = match[1] !== undefined;
    try {
      result += katex.renderToString(display ? match[1] : match[2], { displayMode: display, throwOnError: false });
    } catch {
      result += escapeHtml(match[0]);
    }
    last = (match.index ?? 0) + match[0].length;
  }
  return result + sanitizePlainText(source.slice(last));
}
