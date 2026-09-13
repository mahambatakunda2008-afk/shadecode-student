const SIMPLE_MATH_TOKEN = "(?:\\d+(?:\\.\\d+)?|[A-Za-z](?:_[A-Za-z0-9]+)?)";

/** Normalize one mathematical expression without touching surrounding prose. */
export function normalizeMathSource(source: string): string {
  let value = source.trim();
  value = value.replace(/\^\s*(?!\{)([-+]?\d+(?:\.\d+)?|[A-Za-z](?:_[A-Za-z0-9]+)?|\([^)]*\))/g, "^{$1}");
  value = value.replace(new RegExp(`(?<![A-Za-z0-9}])(${SIMPLE_MATH_TOKEN}|\\([^\\n()]+\\))\\s*\\/\\s*(${SIMPLE_MATH_TOKEN}|\\([^\\n()]+\\))`, "g"), "\\frac{$1}{$2}");
  value = value.replace(/\b(d[a-zA-Z])\s*\/\s*(d[a-zA-Z])\b/g, "\\frac{$1}{$2}");
  return value;
}

/** Canonicalize model output so persisted lessons carry renderable math notation. */
export function normalizeMathContent(content: string): string {
  if (!content.trim()) return content;
  const explicit = /\$[^$\n]+\$|\\\([^\n]+\\\)/g;
  let output = "";
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = explicit.exec(content)) !== null) {
    output += normalizePlainMath(content.slice(cursor, match.index));
    output += match[0].startsWith("\\(") ? `\\(${normalizeMathSource(match[0].slice(2, -2))}\\)` : `$${normalizeMathSource(match[0].slice(1, -1))}$`;
    cursor = match.index + match[0].length;
  }
  output += normalizePlainMath(content.slice(cursor));
  return output;
}

function normalizePlainMath(text: string): string {
  let value = text;
  value = value.replace(/([A-Za-z0-9)\]}]+\s*\^\s*(?:\{[^}]+\}|[A-Za-z0-9()+\-]+)(?:\s*[=+\-*/]\s*[A-Za-z0-9()^{}]+)*)/g, (expression) => `$${normalizeMathSource(expression)}$`);
  value = value.replace(new RegExp(`(${SIMPLE_MATH_TOKEN})\\s*\\/\\s*(${SIMPLE_MATH_TOKEN})`, "g"), (expression) => `$${normalizeMathSource(expression)}$`);
  value = value.replace(/\b(d[a-zA-Z])\s*\/\s*(d[a-zA-Z])\b/g, (expression) => `$${normalizeMathSource(expression)}$`);
  return value;
}

export function normalizeLessonBlocks<T extends { content?: unknown }>(blocks: T[]): T[] {
  return blocks.map((block) => typeof block.content === "string" ? { ...block, content: normalizeMathContent(block.content) } : block);
}
