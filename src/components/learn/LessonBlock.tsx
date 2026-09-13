"use client";

import MathRenderer, { containsMathSyntax } from "./MathRenderer";
import { normalizeMathContent } from "@/lib/learn/mathNotation";

interface Props {
  type: string;
  content: string;
}

function InlineContent({ content }: { content: string }) {
  const normalized = normalizeMathContent(content);
  return containsMathSyntax(normalized) ? (
    <MathRenderer content={normalized} block={false} />
  ) : (
    <>{normalized}</>
  );
}

export default function LessonBlock({ type, content }: Props) {
  const normalized = normalizeMathContent(content);

  switch (type) {
    case "text":
      return (
        <p style={{ lineHeight: 1.7 }}>
          <InlineContent content={normalized} />
        </p>
      );

    case "example":
      return (
        <div style={{ padding: 12, borderLeft: "3px solid #6366f1", background: "rgba(99,102,241,0.06)", borderRadius: 8 }}>
          <strong>Example</strong>
          <p style={{ marginTop: 6 }}>
            <InlineContent content={normalized} />
          </p>
        </div>
      );

    case "math":
      return (
        <div style={{ padding: "8px 0" }}>
          <MathRenderer content={normalized} block />
        </div>
      );

    case "tip":
      return (
        <div style={{ padding: 10, background: "rgba(34,197,94,0.08)", borderRadius: 8 }}>
          <strong>Tip:</strong> <InlineContent content={normalized} />
        </div>
      );

    default:
      return (
        <p>
          <InlineContent content={normalized} />
        </p>
      );
  }
}
