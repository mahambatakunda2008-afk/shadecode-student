"use client";

import MathRenderer from "./MathRenderer";

interface Props {
  type: string;
  content: string;
}

function containsMath(text: string) {
  return text.includes("^") || text.includes("=") || text.includes("\\");
}

export default function LessonBlock({ type, content }: Props) {
  switch (type) {
    case "text":
      return (
        <p style={{ lineHeight: 1.7 }}>
          {content}
        </p>
      );

    case "example":
      return (
        <div style={{ padding: 12, borderLeft: "3px solid #6366f1", background: "rgba(99,102,241,0.06)", borderRadius: 8 }}>
          <strong>Example</strong>
          <p style={{ marginTop: 6 }}>
            {content}
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
          <strong>Tip:</strong> {content}
        </div>
      );

    default:
      return (
        <p>
          {containsMath(content) ? (
            <MathRenderer content={content} block={false} />
          ) : (
            content
          )}
        </p>
      );
  }
}
