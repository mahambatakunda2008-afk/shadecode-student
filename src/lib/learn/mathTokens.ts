/**
 * src/lib/learn/mathTokens.ts
 *
 * Decides what kind of math a delimited token is and which text to hand to KaTeX.
 * Single-dollar spans ($x$) are INLINE: strip one character from each end.
 * Only $$...$$, \[...\] and \begin{...} environments are display math, where two
 * characters are stripped. Treating "$...$" as display used to strip two characters
 * from every inline formula ("$116^\circ$" rendered as "16^\cir", "$O$" as nothing).
 */

export interface MathToken {
  kind: "display" | "inline";
  expression: string;
}

export function classifyMathToken(token: string): MathToken | null {
  if (token.startsWith("\\begin{")) return { kind: "display", expression: token };
  if (token.length >= 4 && token.startsWith("$$") && token.endsWith("$$")) return { kind: "display", expression: token.slice(2, -2) };
  if (token.length >= 4 && token.startsWith("\\[") && token.endsWith("\\]")) return { kind: "display", expression: token.slice(2, -2) };
  if (token.length >= 3 && token.startsWith("$") && token.endsWith("$")) return { kind: "inline", expression: token.slice(1, -1) };
  if (token.length >= 4 && token.startsWith("\\(") && token.endsWith("\\)")) return { kind: "inline", expression: token.slice(2, -2) };
  return null;
}
