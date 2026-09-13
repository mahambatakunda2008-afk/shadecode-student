"use client";

import MathRenderer from "./MathRenderer";

interface Props {
  type: string;
  content: string;
}

function containsMath(text: string) {
  return (
    /[A-Za-z0-9)\]}]\s*\^\s*(?:\{[^}]+\}|[A-Za-z0-9(+\-]+)/.test(text) ||
    /[A-Za-z0-9)\]}]\s*\/\s*[A-Za-z0-9([{]/.test(text) ||
    /\\(?:frac|sqrt|sin|cos|tan|log|ln|int|sum|prod|lim)\b/.test(text) ||
    /\b(?:[A-Za-z]|\d+)\s*=\s*(?:[A-Za-z0-9+\-*/^().]+)/.test(text)
  );
}

function InlineContent({ content }: { content: string }) {
  return containsMath(content) ? <MathRenderer content={content} block={false} /> : <>{content}</>;
}

export default function LessonBlock({ type, content }: Props) {
  switch (type) {
    case "text":
      return (
        <p style={{ lineHeight: 1.7 }}>
          <InlineContent content={content} />
        </p>
      );

    case "example":
      return (
        <div style={{ padding: 12, borderLeft: "3px solid #6366f1", background: "rgba(99,102,241,0.06)", borderRadius: 8 }}>
          <strong>Example</strong>
          <p style={{ marginTop: 6 }}>
            <InlineContent content={content} />
          </p>
        </div>
      );

    case "math":
      return (
        <div style={{ padding: "8px 0" }}>
          <MathRenderer content={content} block />
        </div>
      );

    case "tip":
      return (
        <div style={{ padding: 10, background: "rgba(34,197,94,0.08)", borderRadius: 8 }}>
          <strong>Tip:</strong> <InlineContent content={content} />
        </div>
      );

    default:
      return (
        <p>
          <InlineContent content={content} />
        </p>
      );
  }
}
