"use client";

import katex from "katex";
import "katex/dist/katex.min.css";

interface Props {
  content: string;
  block?: boolean;
}

/**
 * Convert the plain-text notation models commonly emit into actual
 * mathematical notation before KaTeX sees it.
 *
 * This is deliberately syntax-driven, not topic-driven. It handles powers,
 * fractions and common grouped powers without maintaining a list of topics.
 */
function normalizeMathSource(source: string): string {
  let value = source.trim();

  // x^2 -> x^{2}; e^x -> e^{x}; x^{n} is already valid and is preserved.
  value = value.replace(/\^\s*(?!\{)([-+]?\d+(?:\.\d+)?|[A-Za-z](?:_[A-Za-z0-9]+)?|\([^)]*\))/g, "^{$1}");

  // Turn simple mathematical division into a real fraction. This runs only
  // inside MathRenderer, so ordinary prose/URLs are never rewritten.
  value = value.replace(
    /(?<![A-Za-z0-9}])([A-Za-z0-9]+(?:_[A-Za-z0-9]+)?(?:\([^)]*\))?)\s*\/\s*([A-Za-z0-9]+(?:_[A-Za-z0-9]+)?(?:\([^)]*\))?)/g,
    "\\frac{$1}{$2}"
  );

  return value;
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

/**
 * Render mixed educational text while preserving normal prose.
 * Expressions containing powers or fractions are promoted to inline math.
 */
function renderInlineContent(content: string) {
  const expressionPattern = /(?:[A-Za-z0-9()]+\s*\^\s*(?:\{[^}]+\}|[A-Za-z0-9()+-]+)|[A-Za-z0-9()]+\s*\/\s*[A-Za-z0-9()]+)(?:\s*[=+\-*/]\s*[A-Za-z0-9()^{}]+)*/g;
  const parts = content.split(expressionPattern);
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
  if (!block) return renderInlineContent(content);

  const html = renderMath(content, true);
  if (html === null) return <span>{content}</span>;

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
