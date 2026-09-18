import type { ShadeDiagnostic, ShadeToken } from "./types";

const KEYWORDS = new Set(["show", "input", "if", "else", "while", "for", "in", "function", "return", "true", "false", "none", "and", "or", "then", "end"]);

export function lexShade(source: string): { tokens: ShadeToken[]; diagnostics: ShadeDiagnostic[] } {
  const tokens: ShadeToken[] = [];
  const diagnostics: ShadeDiagnostic[] = [];
  let i = 0;
  let line = 1;
  let column = 1;

  const advance = (count = 1) => {
    for (let n = 0; n < count; n += 1) {
      if (source[i] === "\n") { line += 1; column = 1; } else column += 1;
      i += 1;
    }
  };

  while (i < source.length) {
    const ch = source[i];
    if (ch === " " || ch === "\t" || ch === "\r") { advance(); continue; }
    if (ch === "\n") { tokens.push({ kind: "newline", value: "\n", line, column }); advance(); continue; }
    if (ch === "#") { while (i < source.length && source[i] !== "\n") advance(); continue; }

    const startLine = line;
    const startColumn = column;
    if (/[0-9]/.test(ch)) {
      const start = i;
      while (/[0-9.]/.test(source[i] ?? "")) advance();
      tokens.push({ kind: "number", value: source.slice(start, i), line: startLine, column: startColumn });
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      advance();
      let value = "";
      let closed = false;
      while (i < source.length) {
        if (source[i] === quote) { advance(); closed = true; break; }
        if (source[i] === "\\") {
          const next = source[i + 1];
          const escapes: Record<string, string> = { n: "\n", r: "\r", t: "\t", "\\": "\\", '"': '"', "'": "'" };
          value += escapes[next] ?? next ?? "";
          advance(2);
        } else { value += source[i]; advance(); }
      }
      tokens.push({ kind: "string", value, line: startLine, column: startColumn });
      if (!closed) diagnostics.push({ severity: "error", message: "Unterminated string literal.", line: startLine, column: startColumn });
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const start = i;
      while (/[A-Za-z0-9_]/.test(source[i] ?? "")) advance();
      const value = source.slice(start, i);
      tokens.push({ kind: KEYWORDS.has(value) ? "keyword" : "identifier", value, line: startLine, column: startColumn });
      continue;
    }

    const two = source.slice(i, i + 2);
    if (["==", "!=", "<=", ">="].includes(two)) { tokens.push({ kind: "operator", value: two, line: startLine, column: startColumn }); advance(2); continue; }
    const single: Record<string, ShadeToken["kind"]> = { "+": "operator", "-": "operator", "*": "operator", "/": "operator", "%": "operator", "<": "operator", ">": "operator", "=": "operator", "(": "lparen", ")": "rparen", "[": "lbracket", "]": "rbracket", ",": "comma", ":": "colon" };
    if (single[ch]) { tokens.push({ kind: single[ch], value: ch, line: startLine, column: startColumn }); advance(); continue; }

    diagnostics.push({ severity: "error", message: `Unexpected character '${ch}'.`, line: startLine, column: startColumn });
    advance();
  }
  tokens.push({ kind: "eof", value: "", line, column });
  return { tokens, diagnostics };
}
