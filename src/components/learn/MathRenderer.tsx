"use client";

import katex from "katex";
import "katex/dist/katex.min.css";

interface Props {
  content: string;
  block?: boolean;
}

/** Convert model-friendly plain-text math into KaTeX syntax. */
export function normalizeMathSource(source: string): string {
  let value = source.trim();

  // x^2 -> x^{2}; e^x -> e^{x}; x^{n} stays untouched.
  value = value.replace(
    /\^\s*(?!\{)([-+]?\d+(?:\.\d+)?|[A-Za-z](?:_[A-Za-z0-9]+)?|\([^)]*\))/g,
    "^{$1}"
  );

  // Conservative fractions. Never turn ordinary prose such as and/or into math.
  value = value.replace(
    /(?<![A-Za-z0-9}])((?:\d+(?:\.\d+)?|[A-Za-z](?:_[A-Za-z0-9]+)?|\([^\n()]+\)))\s*\/\s*((?:\d+(?:\.\d+)?|[A-Za-z](?:_[A-Za-z0-9]+)?|\([^\n()]+\)))/g,
    "\\frac{$1}{$2}"
  );

  // Differential notation such as dy/dx.
  value = value.replace(/\b(d[a-zA-Z])\s*\/\s*(d[a-zA-Z])\b/g, "\\frac{$1}{$2}");

  return value;
}

/** Whether text contains mathematical syntax worth rendering. */
export function containsMathSyntax(text: string): boolean {
  return (
    /\$[^$\n]+\$/.test(text) ||
    /\\\([^\n]+\\\)/.test(text) ||
    /\\\[[\s\S]+\\\]/.test(text) ||
    /[A-Za-z0-9)\]}]\s*\^\s*(?:\{[^}]+\}|[A-Za-z0-9(+\-]+)/.test(text) ||
    /(?:\d+(?:\.\d+)?|[A-Za-z](?:_[A-Za-z0-9]+)?)\s*\/\s*(?:\d+(?:\.\d+)?|[A-Za-z](?:_[A-Za-z0-9]+)?)/.test(text) ||
    /\b(?:d[a-zA-Z])\s*\/\s*(?:d[a-zA-Z])\b/.test(text) ||
    /\\(?:frac|sqrt|sin|cos|tan|log|ln|int|sum|prod|lim)\b/.test(text) ||
    /\b(?:[A-Za-z]|\d+)\s*=\s*(?:[A-Za-z0-9+\-*/^().]+)/.test(text)
  );
}

function renderMath(source: string, displayMode: boolean): string | null {
  try {
    return katex.renderToString(normalizeMathSource(source), {
      throwOnError: false,
      displayMode,
      output: "htmlAndMathml",
    });
  } catch {
    return null;
  }
}

function pushRendered(output: React.ReactNode[], source: string, key: string, displayMode = false) {
  const html = renderMath(source, displayMode);
  output.push(
    html ? (
      <span key={key} dangerouslySetInnerHTML={{ __html: html }} />
    ) : (
      <span key={key}>{source}</span>
    )
  );
}

/** Render mixed educational prose and mathematical expressions inline. */
export function renderInlineMathContent(content: string) {
  const output: React.ReactNode[] = [];
  let cursor = 0;

  // First honor explicit math delimiters emitted by lesson/AI content.
  const explicitPattern = /\$([^$\n]+)\$|\\\(([^\n]+)\\\)/g;
  let explicitMatch: RegExpExecArray | null;
  while ((explicitMatch = explicitPattern.exec(content)) !== null) {
    if (explicitMatch.index > cursor) output.push(content.slice(cursor, explicitMatch.index));
    pushRendered(output, explicitMatch[1] ?? explicitMatch[2], `explicit-${explicitMatch.index}`);
    cursor = explicitMatch.index + explicitMatch[0].length;
  }

  if (cursor < content.length) {
    const remainder = content.slice(cursor);
    const expressionPattern = /(?:[A-Za-z0-9)\]}]+\s*\^\s*(?:\{[^}]+\}|[A-Za-z0-9()+\-]+)|(?:\d+(?:\.\d+)?|[A-Za-z](?:_[A-Za-z0-9]+)?)\s*\/\s*(?:\d+(?:\.\d+)?|[A-Za-z](?:_[A-Za-z0-9]+)?)|\bd[a-zA-Z]\s*\/\s*d[a-zA-Z]\b)(?:\s*[=+\-*/]\s*[A-Za-z0-9()^{}]+)*/g;
    let last = 0;
    let match: RegExpExecArray | null;

    while ((match = expressionPattern.exec(remainder)) !== null) {
      if (match.index > last) output.push(remainder.slice(last, match.index));
      pushRendered(output, match[0], `heuristic-${cursor + match.index}`);
      last = match.index + match[0].length;
    }

    if (last < remainder.length) output.push(remainder.slice(last));
  }

  return <>{output}</>;
}

export default function MathRenderer({ content, block = true }: Props) {
  if (!block) return renderInlineMathContent(content);

  const html = renderMath(content, true);
  if (html === null) return <span>{content}</span>;

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
