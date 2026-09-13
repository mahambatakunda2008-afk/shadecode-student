const SIMPLE_MATH_TOKEN = "(?:\\d+(?:\\.\\d+)?|[A-Za-z](?:_[A-Za-z0-9]+)?)";
const MATHISH_TOKEN = "(?:\\d+(?:\\.\\d+)?|[A-Za-z](?:_[A-Za-z0-9]+)?|\\([^\\n()]+\\)|\\[[^\\n\\]]+\\])";

export function normalizeMathSource(source: string): string {
  let value = source.trim();
  value = value.replace(/\^\s*(?!\{)([-+]?\d+(?:\.\d+)?|[A-Za-z](?:_[A-Za-z0-9]+)?|\([^)]*\))/g, "^{$1}");
  value = value.replace(new RegExp(`(?<![A-Za-z0-9}])(${MATHISH_TOKEN})\\s*\\/\\s*(${MATHISH_TOKEN})`, "g"), "\\frac{$1}{$2}");
  value = value.replace(/\b(d[a-zA-Z])\s*\/\s*(d[a-zA-Z])\b/g, "\\frac{$1}{$2}");
  return value;
}

function repairBrokenMathMarkdown(text: string): string {
  return text.split("\n").map((line) => {
    if (!/[∫∑∏√]|\^|\\(?:frac|int|sqrt)\b/.test(line)) return line;
    return line.replace(/`/g, "");
  }).join("\n");
}

function isSafePlainFraction(numerator: string, denominator: string): boolean {
  const isToken = (value: string) => /^(?:\d+(?:\.\d+)?|[A-Za-z](?:_[A-Za-z0-9]+)?)$/.test(value.trim());
  return isToken(numerator) && isToken(denominator);
}

function normalizePlainMath(text: string): string {
  let value = repairBrokenMathMarkdown(text);

  // Repair unmatched equation delimiters commonly produced by mixed markdown.
  value = value.replace(/(?:∫|∑|∏|√)[^\n$]*(?:\$|$)/g, (expression) => {
    const source = expression.replace(/\$$/, "").trim();
    return /[=^\\]|[A-Za-z]\s*[A-Za-z]/.test(source)
      ? `$${normalizeMathSource(source)}$`
      : expression;
  });

  value = value.replace(/\b([A-Za-z0-9)\]}]+\s*\^\s*(?:\{[^}]+\}|[A-Za-z0-9()+\-]+)(?:\s*[=+\-*/]\s*[A-Za-z0-9()^{}]+)*)/g, (expression) => `$${normalizeMathSource(expression)}$`);

  value = value.replace(new RegExp(`\\b(${SIMPLE_MATH_TOKEN})\\s*\\/\\s*(${SIMPLE_MATH_TOKEN})\\b`, "g"), (expression, numerator: string, denominator: string) => {
    return isSafePlainFraction(numerator, denominator) ? `$${normalizeMathSource(expression)}$` : expression;
  });

  value = value.replace(/\b(d[a-zA-Z])\s*\/\s*(d[a-zA-Z])\b/g, (expression) => `$${normalizeMathSource(expression)}$`);
  return value;
}

export function normalizeMathContent(content: string): string {
  if (!content.trim()) return content;
  const repaired = repairBrokenMathMarkdown(content);
  const explicit = /\$[^$\n]+\$|\\\([^\n]+\\\)|\\\[[^\n]+\\\]/g;
  let output = "";
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = explicit.exec(repaired)) !== null) {
    output += normalizePlainMath(repaired.slice(cursor, match.index));
    const token = match[0];
    if (token.startsWith("\\(")) output += `\\(${normalizeMathSource(token.slice(2, -2))}\\)`;
    else if (token.startsWith("\\[")) output += `\\[${normalizeMathSource(token.slice(2, -2))}\\]`;
    else output += `$${normalizeMathSource(token.slice(1, -1))}$`;
    cursor = match.index + token.length;
  }

  output += normalizePlainMath(repaired.slice(cursor));
  return output;
}

export function normalizeLessonBlocks<T extends { content?: unknown }>(blocks: T[]): T[] {
  return blocks.map((block) => typeof block.content === "string"
    ? { ...block, content: normalizeMathContent(block.content) }
    : block);
}
