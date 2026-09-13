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

  // Conservative fractions. This intentionally does not turn prose such as
  // "and/or" into mathematics.
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

/** Render mixed educational prose and mathematical expressions inline. */
export function renderInlineMathContent(content: string) {
  const expressionPattern = /(?:[A-Za-z0-9)\]}]+\s*\^\s*(?:\{[^}]+\}|[A-Za-z0-9()+\-]+)|(?:\d+(?:\.\d+)?|[A-Za-z](?:_[A-Za-z0-9]+)?)\s*\/\s*(?:\d+(?:\.\d+)?|[A-Za-z](?:_[A-Za-z0-9]+)?)|\bd[a-zA-Z]\s*\/\s*d[a-zA-Z]\b)(?:\s*[=+\-*/]\s*[A-Za-z0-9()^{}]+)*/g;
  const matches = content.match(expressionPattern) ?? [];

  if (matches.length === 0) return <>{content}</>;

  const output: React.ReactNode[] = [];
  let cursor = 0;
  for (const match of matches) {
    const index = content.indexOf(match, cursor);
    if (index > cursor) output.push(content.slice(cursor, index));

    const html = renderMath(match, false);
    output.push(
      html ? (
        <span key={`${index}-${match}`} dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <span key={`${index}-${match}`}>{match}</span>
      )
    );
    cursor = index + match.length;
  }

  if (cursor < content.length) output.push(content.slice(cursor));
  return <>{output}</>;
}

export default function MathRenderer({ content, block = true }: Props) {
  if (!block) return renderInlineMathContent(content);

  const html = renderMath(content, true);
  if (html === null) return <span>{content}</span>;

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
